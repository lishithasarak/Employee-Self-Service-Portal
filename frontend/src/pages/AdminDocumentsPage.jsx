import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../utils/api';

const emptyForm = {
  title: '',
  category: '',
  file: null,
  visibility: 'ALL'
};

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/api\/?$/, '');

const AdminDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState(['ALL']);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await apiGet('/documents');

      setDocuments(data.documents || []);

      setCategories([
        'ALL',
        ...(data.categories || [])
      ]);
    } catch (err) {
      setError(
        err.message || 'Failed to load documents.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setForm({
        ...form,
        file: null
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      setError('File size must not exceed 10 MB.');
      event.target.value = '';

      setForm({
        ...form,
        file: null
      });

      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(
        'Invalid file type. Allowed files are PDF, JPG, PNG, WEBP, DOC, and DOCX.'
      );

      event.target.value = '';

      setForm({
        ...form,
        file: null
      });

      return;
    }

    setError('');

    setForm({
      ...form,
      file: selectedFile
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!form.file) {
        setError('Please select a file to upload.');
        return;
      }

      if (!form.title.trim()) {
        setError('Document title is required.');
        return;
      }

      if (!form.category.trim()) {
        setError('Document category is required.');
        return;
      }

      const formData = new FormData();

      formData.append('title', form.title.trim());
      formData.append('category', form.category.trim());
      formData.append('visibility', form.visibility);
      formData.append('file', form.file);

      const data = await apiPost(
        '/documents',
        formData
      );

      setSuccess(
        data.message ||
          'Document uploaded successfully.'
      );

      setForm({
        ...emptyForm
      });

      setShowForm(false);

      setTimeout(() => {
        setSuccess('');
      }, 3000);

      await load();
    } catch (err) {
      setError(
        err.message ||
          'Failed to upload document.'
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);

    setForm({
      ...emptyForm
    });

    setError('');
  };

  const getFileUrl = (document) => {
    if (!document?.file_url) {
      return '';
    }

    return `${API_ORIGIN}${document.file_url}`;
  };

  const isPdf = (document) => {
    const fileUrl = document?.file_url || '';

    return fileUrl
      .toLowerCase()
      .endsWith('.pdf');
  };

  const openDocument = (document) => {
    if (!document.file_url) {
      setError('This document file is unavailable.');
      return;
    }

    if (isPdf(document)) {
      setSelectedDocument(document);
      setShowPdfViewer(true);
      return;
    }

    window.open(
      getFileUrl(document),
      '_blank',
      'noopener,noreferrer'
    );
  };

  const closePdfViewer = () => {
    setShowPdfViewer(false);
    setSelectedDocument(null);
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
        Loading documents...
      </div>
    );
  }

  const filtered =
    selectedCategory === 'ALL'
      ? documents
      : documents.filter(
          (document) =>
            document.category === selectedCategory
        );

  return (
    <div className="page-section">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <p className="eyebrow">
            Document Management
          </p>

          <h2>
            Manage Company Documents
          </h2>
        </div>

        <button
          className="primary-btn"
          onClick={
            showForm
              ? cancelForm
              : () => {
                  setError('');
                  setSuccess('');
                  setShowForm(true);
                }
          }
        >
          {showForm
            ? 'Cancel'
            : 'Add Document'}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="card panel error-box">
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div className="card panel success-box">
          {success}
        </div>
      )}

      {/* UPLOAD FORM */}
      {showForm && (
        <div className="card panel">
          <h3>Add Company Document</h3>

          <form
            onSubmit={submit}
            style={{
              display: 'grid',
              gap: '1rem'
            }}
          >
            <input
              required
              placeholder="Document title"
              maxLength="150"
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value
                })
              }
            />

            <input
              required
              placeholder="Category (e.g. Policy)"
              maxLength="80"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value
                })
              }
            />

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '.4rem',
                  fontWeight: '600'
                }}
              >
                Select Document
              </label>

              <input
                required
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={handleFileChange}
              />

              <small
                style={{
                  display: 'block',
                  marginTop: '.4rem',
                  opacity: 0.7
                }}
              >
                Maximum file size: 10 MB.
                Allowed: PDF, JPG, PNG, WEBP,
                DOC, DOCX.
              </small>

              {form.file && (
                <small
                  style={{
                    display: 'block',
                    marginTop: '.4rem'
                  }}
                >
                  Selected file:{' '}
                  <strong>
                    {form.file.name}
                  </strong>
                </small>
              )}
            </div>

            <select
              value={form.visibility}
              onChange={(e) =>
                setForm({
                  ...form,
                  visibility: e.target.value
                })
              }
            >
              <option value="ALL">
                All employees
              </option>

              <option value="EMPLOYEE">
                Employees
              </option>

              <option value="MANAGER">
                Managers
              </option>

              <option value="ADMIN">
                Admins
              </option>
            </select>

            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving
                ? 'Uploading...'
                : 'Upload Document'}
            </button>
          </form>
        </div>
      )}

      {/* CATEGORY FILTER */}
      <div className="card panel">
        <h3>Filter by Category</h3>

        <div
          style={{
            display: 'flex',
            gap: '.5rem',
            flexWrap: 'wrap',
            marginTop: '1rem'
          }}
        >
          {categories.map((category) => (
            <button
              key={category}
              className={
                selectedCategory === category
                  ? 'primary-btn small'
                  : 'secondary-btn small'
              }
              onClick={() =>
                setSelectedCategory(category)
              }
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* DOCUMENT TABLE */}
      <div className="card panel">
        <h3>
          All Documents ({filtered.length})
        </h3>

        <div
          style={{
            overflowX: 'auto'
          }}
        >
          <table className="data-table">

            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Visibility</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: 'center',
                      padding: '2rem'
                    }}
                  >
                    No documents found.
                  </td>
                </tr>
              ) : (
                filtered.map((document) => (
                  <tr key={document.id}>

                    <td>
                      {document.title}
                    </td>

                    <td>
                      {document.category}
                    </td>

                    <td>
                      {document.created_at
                        ?.slice(0, 10)}
                    </td>

                    <td>
                      {document.visibility}
                    </td>

                    <td>
                      {document.file_url ? (
                        <div
                          style={{
                            display: 'flex',
                            gap: '.4rem',
                            flexWrap: 'wrap'
                          }}
                        >
                          <button
                            className="primary-btn small"
                            onClick={() =>
                              openDocument(document)
                            }
                          >
                            {isPdf(document)
                              ? 'View PDF'
                              : 'Open'}
                          </button>

                          <a
                            href={getFileUrl(document)}
                            className="secondary-btn small"
                            download
                          >
                            Download
                          </a>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: 'var(--muted)',
                            fontSize: '.9rem'
                          }}
                        >
                          File unavailable
                        </span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* PDF VIEWER */}
      {showPdfViewer && selectedDocument && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={closePdfViewer}
        >
          <div
            className="card panel"
            style={{
              width: 'min(1100px, 95vw)',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '1rem'
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '.75rem'
              }}
            >
              <div>
                <p className="eyebrow">
                  PDF Document
                </p>

                <h3 style={{ margin: 0 }}>
                  {selectedDocument.title}
                </h3>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '.5rem'
                }}
              >
                <a
                  href={getFileUrl(
                    selectedDocument
                  )}
                  className="secondary-btn small"
                  download
                >
                  Download
                </a>

                <button
                  className="secondary-btn small"
                  onClick={closePdfViewer}
                >
                  Close
                </button>
              </div>
            </div>

            <iframe
              src={getFileUrl(
                selectedDocument
              )}
              title={selectedDocument.title}
              style={{
                width: '100%',
                flex: 1,
                border: '1px solid var(--border, #ddd)',
                borderRadius: '8px',
                background: '#fff'
              }}
            />

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDocumentsPage;