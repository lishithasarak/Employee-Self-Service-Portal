import { useEffect, useState } from 'react';
import { apiGet } from '../utils/api';

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/api\/?$/, '');

const DocumentPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [categories, setCategories] = useState([]);

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
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

    fetchDocuments();
  }, []);

  const getFileUrl = (document) => {
    if (!document?.file_url) {
      return '';
    }

    return `${API_ORIGIN}${document.file_url}`;
  };

  const isPdf = (document) => {
    const fileUrl = document?.file_url || '';

    return (
      fileUrl.toLowerCase().endsWith('.pdf')
    );
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

  const filteredDocs =
    selectedCategory === 'ALL'
      ? documents
      : documents.filter(
          (doc) =>
            doc.category === selectedCategory
        );

  return (
    <div className="page-section">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <p className="eyebrow">
            Documents
          </p>

          <h2>
            Company Documents & Resources
          </h2>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="card panel error-box">
          {error}
        </div>
      )}

      {/* CATEGORY FILTER */}
      <div className="card panel">
        <h3>Filter by Category</h3>

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
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

      {/* DOCUMENT LIST */}
      <div className="card panel">
        <h3>
          Documents ({filteredDocs.length})
        </h3>

        {filteredDocs.length === 0 ? (
          <p
            style={{
              color: 'var(--muted)',
              textAlign: 'center',
              padding: '2rem'
            }}
          >
            No documents found in this category
          </p>
        ) : (
          <div className="document-list">

            {filteredDocs.map((document) => (
              <div
                key={document.id}
                className="document-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >

                {/* DOCUMENT INFORMATION */}
                <div>
                  <strong
                    style={{
                      display: 'block',
                      marginBottom: '0.3rem'
                    }}
                  >
                    {document.title}
                  </strong>

                  <p
                    style={{
                      color: 'var(--muted)',
                      fontSize: '0.9rem',
                      margin: 0
                    }}
                  >
                    {document.category}
                  </p>
                </div>

                {/* ACTIONS */}
                {document.file_url ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
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
                      fontSize: '0.9rem'
                    }}
                  >
                    File unavailable
                  </span>
                )}

              </div>
            ))}

          </div>
        )}
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

            {/* VIEWER HEADER */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '0.75rem'
              }}
            >
              <div>
                <p className="eyebrow">
                  PDF Document
                </p>

                <h3
                  style={{
                    margin: 0
                  }}
                >
                  {selectedDocument.title}
                </h3>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem'
                }}
              >
                <a
                  href={getFileUrl(selectedDocument)}
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

            {/* PDF */}
            <iframe
              src={getFileUrl(selectedDocument)}
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

export default DocumentPage;