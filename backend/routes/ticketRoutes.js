const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const isValidTicketText = (value, minLength = 1, maxLength = 2000) => typeof value === 'string' && value.trim().length >= minLength && value.trim().length <= maxLength;

// ============================================================
// GET ALL TICKETS
// Employee -> sees own tickets
// Manager/Admin -> sees all tickets
// ============================================================
router.get(
  '/',
  authenticate,
  authorize('EMPLOYEE', 'MANAGER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const role = req.user.role;

      let query = `
        SELECT
          st.id,
          st.employee_id,
          st.category,
          st.subject,
          st.description,
          st.priority,
          st.status,
          st.assigned_to,
          st.created_at,

          u.name AS employee_name,

          au.name AS assigned_to_name

        FROM support_tickets st

        LEFT JOIN employees e
          ON e.id = st.employee_id

        LEFT JOIN users u
          ON u.id = e.user_id

        LEFT JOIN employees a
          ON a.id = st.assigned_to

        LEFT JOIN users au
          ON au.id = a.user_id

        WHERE 1 = 1
      `;

      const params = [];

      // Employees can see only their own tickets
      if (role === 'EMPLOYEE') {
        query += `
          AND st.employee_id = (
            SELECT id
            FROM employees
            WHERE user_id = ?
            LIMIT 1
          )
        `;

        params.push(req.user.id);
      }

      // Manager/Admin can see all tickets

      query += `
        ORDER BY st.created_at DESC
        LIMIT 100
      `;

      const [tickets] = await db.query(query, params);

      res.status(200).json({
        tickets: tickets || [],
        count: (tickets || []).length
      });
    } catch (error) {
      next(error);
    }
  }
);


// ============================================================
// GET TICKET BY ID
// ============================================================
router.get(
  '/:id',
  authenticate,
  authorize('EMPLOYEE', 'MANAGER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const ticketId = req.params.id;
      const role = req.user.role;

      const [tickets] = await db.query(
        `
        SELECT
          st.id,
          st.employee_id,
          st.category,
          st.subject,
          st.description,
          st.priority,
          st.status,
          st.assigned_to,
          st.created_at,

          u.name AS employee_name,

          au.name AS assigned_to_name

        FROM support_tickets st

        LEFT JOIN employees e
          ON e.id = st.employee_id

        LEFT JOIN users u
          ON u.id = e.user_id

        LEFT JOIN employees a
          ON a.id = st.assigned_to

        LEFT JOIN users au
          ON au.id = a.user_id

        WHERE st.id = ?

        LIMIT 1
        `,
        [ticketId]
      );

      if (!tickets || tickets.length === 0) {
        return res.status(404).json({
          message: 'Ticket not found.'
        });
      }

      const ticket = tickets[0];

      // Employee can only view their own ticket
      if (role === 'EMPLOYEE') {
        const [empRows] = await db.query(
          `
          SELECT id
          FROM employees
          WHERE user_id = ?
          LIMIT 1
          `,
          [req.user.id]
        );

        if (
          !empRows ||
          empRows.length === 0 ||
          empRows[0].id !== ticket.employee_id
        ) {
          return res.status(403).json({
            message: 'You do not have permission to view this ticket.'
          });
        }
      }

      // Get ticket messages
      const [messages] = await db.query(
        `
        SELECT
          tm.id,
          tm.ticket_id,
          tm.sender_id,
          tm.message,
          tm.attachment_url,
          tm.created_at,
          u.name AS sender_name

        FROM ticket_messages tm

        LEFT JOIN users u
          ON u.id = tm.sender_id

        WHERE tm.ticket_id = ?

        ORDER BY tm.created_at ASC
        `,
        [ticketId]
      );

      res.status(200).json({
        ticket,
        messages: messages || []
      });
    } catch (error) {
      next(error);
    }
  }
);


// ============================================================
// CREATE TICKET
// ============================================================
router.post(
  '/',
  authenticate,
  authorize('EMPLOYEE', 'MANAGER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const {
        category,
        subject,
        description,
        priority
      } = req.body;

      if (!category || !subject || !description) {
        return res.status(400).json({
          message:
            'Category, subject, and description are required.'
        });
      }

      if (!['IT', 'PAYROLL', 'HR', 'GENERAL', 'ADMIN'].includes(String(category).trim())) {
        return res.status(400).json({
          message: 'Invalid ticket category.'
        });
      }

      if (!isValidTicketText(subject, 3, 150) || !isValidTicketText(description, 10, 2000)) {
        return res.status(400).json({
          message: 'Subject and description length are invalid.'
        });
      }

      // Get employee ID
      const [empRows] = await db.query(
        `
        SELECT id
        FROM employees
        WHERE user_id = ?
        LIMIT 1
        `,
        [req.user.id]
      );

      if (!empRows || empRows.length === 0) {
        return res.status(404).json({
          message: 'Employee record not found.'
        });
      }

      const employeeId = empRows[0].id;

      // Create ticket
      const [result] = await db.query(
        `
        INSERT INTO support_tickets
        (
          employee_id,
          category,
          subject,
          description,
          priority,
          status
        )
        VALUES (?, ?, ?, ?, ?, 'OPEN')
        `,
        [
          employeeId,
          category,
          subject,
          description,
          priority || 'MEDIUM'
        ]
      );

      // Get created ticket
      const [newTicket] = await db.query(
        `
        SELECT
          id,
          employee_id,
          category,
          subject,
          description,
          priority,
          status,
          created_at

        FROM support_tickets

        WHERE id = ?

        LIMIT 1
        `,
        [result.insertId]
      );

      // Notify all admins
      const [adminRows] = await db.query(
        `
        SELECT u.id
        FROM users u
        INNER JOIN roles r
          ON r.id = u.role_id
        WHERE r.name = 'ADMIN'
          AND u.is_active = 1
        `
      );

      await Promise.all(
        adminRows.map((admin) =>
          db.query(
            `
            INSERT INTO notifications
            (
              user_id,
              title,
              message,
              type
            )
            VALUES
            (
              ?,
              'New support ticket',
              ?,
              'TICKET'
            )
            `,
            [
              admin.id,
              `Ticket TKT-${result.insertId}: ${subject}`
            ]
          )
        )
      );

      res.status(201).json({
        message: 'Support ticket created successfully.',
        ticket: newTicket[0]
      });
    } catch (error) {
      next(error);
    }
  }
);


// ============================================================
// UPDATE TICKET
// Admin only
// ============================================================
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req, res, next) => {
    try {
      const ticketId = req.params.id;

      const {
        status,
        priority,
        assigned_to
      } = req.body;

      if (
        status &&
        ![
          'OPEN',
          'IN_PROGRESS',
          'RESOLVED',
          'CLOSED'
        ].includes(status)
      ) {
        return res.status(400).json({
          message: 'Invalid ticket status.'
        });
      }

      if (
        priority &&
        ![
          'LOW',
          'MEDIUM',
          'HIGH',
          'URGENT'
        ].includes(priority)
      ) {
        return res.status(400).json({
          message: 'Invalid ticket priority.'
        });
      }

      // Get current ticket
      const [tickets] = await db.query(
        `
        SELECT
          st.id,
          e.user_id

        FROM support_tickets st

        INNER JOIN employees e
          ON e.id = st.employee_id

        WHERE st.id = ?

        LIMIT 1
        `,
        [ticketId]
      );

      if (!tickets || tickets.length === 0) {
        return res.status(404).json({
          message: 'Ticket not found.'
        });
      }

      const updates = [];
      const params = [];

      if (status) {
        updates.push('status = ?');
        params.push(status);
      }

      if (priority) {
        updates.push('priority = ?');
        params.push(priority);
      }

      if (assigned_to) {
        updates.push('assigned_to = ?');
        params.push(assigned_to);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          message: 'No updates provided.'
        });
      }

      params.push(ticketId);

      await db.query(
        `
        UPDATE support_tickets

        SET ${updates.join(', ')}

        WHERE id = ?
        `,
        params
      );

      // Notify employee
      await db.query(
        `
        INSERT INTO notifications
        (
          user_id,
          title,
          message,
          type
        )
        VALUES
        (
          ?,
          'Support ticket updated',
          ?,
          'TICKET'
        )
        `,
        [
          tickets[0].user_id,
          `Ticket TKT-${ticketId} was updated by support.`
        ]
      );

      // Return updated ticket
      const [updatedTicket] = await db.query(
        `
        SELECT
          id,
          employee_id,
          category,
          subject,
          description,
          priority,
          status,
          assigned_to,
          created_at

        FROM support_tickets

        WHERE id = ?

        LIMIT 1
        `,
        [ticketId]
      );

      res.status(200).json({
        message: 'Ticket updated successfully.',
        ticket: updatedTicket[0]
      });
    } catch (error) {
      next(error);
    }
  }
);


// ============================================================
// ADD MESSAGE TO TICKET
// ============================================================
router.post(
  '/:id/messages',
  authenticate,
  authorize('EMPLOYEE', 'MANAGER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const ticketId = req.params.id;

      const {
        message,
        attachment_url
      } = req.body;

      if (!message) {
        return res.status(400).json({
          message: 'Message content is required.'
        });
      }

      // Verify ticket exists
      const [tickets] = await db.query(
        `
        SELECT
          id,
          employee_id

        FROM support_tickets

        WHERE id = ?

        LIMIT 1
        `,
        [ticketId]
      );

      if (!tickets || tickets.length === 0) {
        return res.status(404).json({
          message: 'Ticket not found.'
        });
      }

      // Employee can only reply to their own ticket
      if (req.user.role === 'EMPLOYEE') {
        const [employeeRows] = await db.query(
          `
          SELECT id
          FROM employees
          WHERE user_id = ?
          LIMIT 1
          `,
          [req.user.id]
        );

        if (
          !employeeRows.length ||
          employeeRows[0].id !== tickets[0].employee_id
        ) {
          return res.status(403).json({
            message:
              'You do not have permission to reply to this ticket.'
          });
        }
      }

      // Insert message
      const [result] = await db.query(
        `
        INSERT INTO ticket_messages
        (
          ticket_id,
          sender_id,
          message,
          attachment_url
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          ticketId,
          req.user.id,
          message,
          attachment_url || null
        ]
      );

      // Fetch created message
      const [newMessage] = await db.query(
        `
        SELECT
          tm.id,
          tm.ticket_id,
          tm.sender_id,
          tm.message,
          tm.attachment_url,
          tm.created_at,
          u.name AS sender_name

        FROM ticket_messages tm

        LEFT JOIN users u
          ON u.id = tm.sender_id

        WHERE tm.id = ?

        LIMIT 1
        `,
        [result.insertId]
      );

      // Notify ticket owner when admin replies
      if (req.user.role === 'ADMIN') {
        const [ownerRows] = await db.query(
          `
          SELECT user_id
          FROM employees
          WHERE id = ?
          LIMIT 1
          `,
          [tickets[0].employee_id]
        );

        if (ownerRows.length) {
          await db.query(
            `
            INSERT INTO notifications
            (
              user_id,
              title,
              message,
              type
            )
            VALUES
            (
              ?,
              'New support ticket reply',
              ?,
              'TICKET'
            )
            `,
            [
              ownerRows[0].user_id,
              `Support replied to ticket TKT-${ticketId}.`
            ]
          );
        }
      } else {
        // Notify admins when employee replies
        const [admins] = await db.query(
          `
          SELECT u.id
          FROM users u
          INNER JOIN roles r
            ON r.id = u.role_id
          WHERE r.name = 'ADMIN'
            AND u.is_active = 1
          `
        );

        await Promise.all(
          admins.map((admin) =>
            db.query(
              `
              INSERT INTO notifications
              (
                user_id,
                title,
                message,
                type
              )
              VALUES
              (
                ?,
                'New ticket reply',
                ?,
                'TICKET'
              )
              `,
              [
                admin.id,
                `The employee replied to ticket TKT-${ticketId}.`
              ]
            )
          )
        );
      }

      res.status(201).json({
        message: 'Message added successfully.',
        ticketMessage: newMessage[0]
      });
    } catch (error) {
      next(error);
    }
  }
);


module.exports = router;