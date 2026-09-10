import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const NotificationsPage = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await apiGet('/notifications');

      setItems(data.notifications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /*
   * Extract ticket ID from notification message.
   *
   * Examples:
   * "Ticket TKT-4: Notification Test"
   * "Support replied to ticket TKT-4."
   * "The employee replied to ticket TKT-4."
   */
  const getTicketId = (message) => {
    if (!message) {
      return null;
    }

    const match = String(message).match(/TKT-(\d+)/i);

    if (!match) {
      return null;
    }

    return match[1];
  };

  /*
   * Handle notification click
   */
  const handleNotificationClick = async (item) => {
    try {
      setError('');

      /*
       * Mark notification as read if it is unread.
       */
      if (!item.is_read) {
        await apiPut(`/notifications/${item.id}/read`, {});
      }

      /*
       * Find related ticket ID.
       */
      const ticketId = getTicketId(item.message);

      /*
       * If this notification belongs to a ticket,
       * open that ticket conversation directly.
       */
      if (ticketId) {
        navigate(`/tickets/${ticketId}`);
        return;
      }

      /*
       * If there is no ticket ID, just refresh
       * the notification list.
       */
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  /*
   * Mark all notifications as read
   */
  const readAll = async () => {
    try {
      setError('');

      await apiPut('/notifications/read-all', {});

      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div
        className="card panel"
        style={{
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="page-section">

      {/* Header */}
      <div className="page-header">
        <div>
          <p className="eyebrow">Notifications</p>
          <h2>Updates and Alerts</h2>
        </div>

        {items.some((item) => !item.is_read) && (
          <button
            className="secondary-btn"
            onClick={readAll}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card panel error-box">
          {error}
        </div>
      )}

      {/* Notifications */}
      <div className="card panel">

        {items.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              padding: '2rem'
            }}
          >
            No notifications yet.
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className="document-item"
              style={{
                width: '100%',
                textAlign: 'left',
                border: 0,
                marginBottom: '.5rem',
                background: item.is_read
                  ? 'transparent'
                  : '#f0f7ff',
                padding: '1rem',
                cursor: 'pointer'
              }}
            >

              <strong>
                {item.title}
              </strong>

              <p
                style={{
                  margin: '.3rem 0'
                }}
              >
                {item.message}
              </p>

              <small>
                {item.type} ·{' '}
                {item.created_at?.slice(0, 10)}
                {item.is_read
                  ? ''
                  : ' · Unread'}
              </small>

            </button>
          ))
        )}

      </div>

    </div>
  );
};

export default NotificationsPage;