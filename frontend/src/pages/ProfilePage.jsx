import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../utils/api';

const API_ORIGIN =
  import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
    : 'http://localhost:5000';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await apiGet('/profile/me');

      setProfile(data.employee);
      setFormData(data.employee);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        'Please select a JPG, JPEG, PNG, or WEBP image.'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        'Profile photo must be smaller than 5 MB.'
      );
      return;
    }

    setError('');
    setSelectedPhoto(file);

    const previewUrl = URL.createObjectURL(file);

    setPhotoPreview(previewUrl);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      const uploadData = new FormData();

      uploadData.append(
        'name',
        formData.name || ''
      );

      uploadData.append(
        'phone',
        formData.phone || ''
      );

      uploadData.append(
        'address',
        formData.address || ''
      );

      uploadData.append(
        'emergency_contact_name',
        formData.emergency_contact_name || ''
      );

      uploadData.append(
        'emergency_contact_phone',
        formData.emergency_contact_phone || ''
      );

      if (selectedPhoto) {
        uploadData.append(
          'profile_photo',
          selectedPhoto
        );
      }

      const updatedProfile = await apiPut(
        '/profile/me',
        uploadData
      );

      setProfile(updatedProfile.employee);
      setFormData(updatedProfile.employee);

      setSelectedPhoto(null);
      setPhotoPreview('');

      setSuccess(
        updatedProfile.message ||
        'Profile updated successfully!'
      );

      setIsEditing(false);

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(
        err.message ||
        'Failed to update profile'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(profile);
    setSelectedPhoto(null);
    setPhotoPreview('');
    setError('');
  };

  if (loading) {
    return (
      <div
        className="card panel"
        style={{
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        Loading profile...
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="card panel error-box">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card panel">
        No profile data found
      </div>
    );
  }

  const currentPhoto =
    photoPreview ||
    (profile.profile_photo
      ? `${API_ORIGIN}${profile.profile_photo}`
      : 'https://via.placeholder.com/90');

  return (
    <div className="page-section">
      {/* PROFILE HEADER */}

      <div className="card panel profile-header">
        <img
          src={currentPhoto}
          alt={profile.name}
          className="profile-image"
        />

        <div>
          <p className="eyebrow">
            Employee Profile
          </p>

          <h2>{profile.name}</h2>

          <p>{profile.designation}</p>

          {isEditing && (
            <div
              style={{
                marginTop: '0.75rem',
              }}
            >
              <label
                className="secondary-btn small"
                style={{
                  cursor: 'pointer',
                  display: 'inline-block',
                }}
              >
                Change Photo

                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handlePhotoChange}
                  style={{
                    display: 'none',
                  }}
                />
              </label>

              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--muted)',
                  marginTop: '0.5rem',
                }}
              >
                JPG, PNG, or WEBP. Maximum size: 5 MB.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="card panel error-box">
          {error}
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="card panel success-box">
          {success}
        </div>
      )}

      {/* PERSONAL INFORMATION */}

      <div className="card panel">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <h3>Personal Information</h3>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            {!isEditing ? (
              <button
                className="primary-btn small"
                onClick={() =>
                  setIsEditing(true)
                }
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  className="primary-btn small"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving
                    ? 'Saving...'
                    : 'Save Changes'}
                </button>

                <button
                  className="secondary-btn small"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="info-grid">
            <div>
              <label>
                <strong>Name</strong>
              </label>

              <input
                type="text"
                name="name"
                value={
                  formData.name || ''
                }
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label>
                <strong>Email</strong>
              </label>

              <input
                type="email"
                value={
                  formData.email || ''
                }
                disabled
                style={{
                  opacity: 0.6,
                }}
              />
            </div>

            <div>
              <label>
                <strong>Phone</strong>
              </label>

              <input
                type="tel"
                name="phone"
                value={
                  formData.phone || ''
                }
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label>
                <strong>Department</strong>
              </label>

              <input
                type="text"
                value={
                  formData.department || ''
                }
                disabled
                style={{
                  opacity: 0.6,
                }}
              />
            </div>

            <div>
              <label>
                <strong>Designation</strong>
              </label>

              <input
                type="text"
                value={
                  formData.designation || ''
                }
                disabled
                style={{
                  opacity: 0.6,
                }}
              />
            </div>

            <div>
              <label>
                <strong>Joining Date</strong>
              </label>

              <input
                type="date"
                value={
                  formData.joining_date
                    ? String(
                        formData.joining_date
                      ).slice(0, 10)
                    : ''
                }
                disabled
                style={{
                  opacity: 0.6,
                }}
              />
            </div>

            <div
              style={{
                gridColumn: '1 / -1',
              }}
            >
              <label>
                <strong>Address</strong>
              </label>

              <textarea
                name="address"
                value={
                  formData.address || ''
                }
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  minHeight: '100px',
                }}
              />
            </div>

            <div>
              <label>
                <strong>
                  Emergency Contact Name
                </strong>
              </label>

              <input
                type="text"
                name="emergency_contact_name"
                value={
                  formData.emergency_contact_name ||
                  ''
                }
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label>
                <strong>
                  Emergency Contact Phone
                </strong>
              </label>

              <input
                type="tel"
                name="emergency_contact_phone"
                value={
                  formData.emergency_contact_phone ||
                  ''
                }
                onChange={handleInputChange}
              />
            </div>
          </div>
        ) : (
          <div className="info-grid">
            <div>
              <strong>Employee ID</strong>
              <span>
                {profile.employee_code}
              </span>
            </div>

            <div>
              <strong>Email</strong>
              <span>{profile.email}</span>
            </div>

            <div>
              <strong>Phone</strong>
              <span>
                {profile.phone || '--'}
              </span>
            </div>

            <div>
              <strong>Department</strong>
              <span>
                {profile.department || '--'}
              </span>
            </div>

            <div>
              <strong>Designation</strong>
              <span>
                {profile.designation || '--'}
              </span>
            </div>

            <div>
              <strong>Joining Date</strong>
              <span>
                {profile.joining_date
                  ? String(
                      profile.joining_date
                    ).slice(0, 10)
                  : '--'}
              </span>
            </div>

            <div>
              <strong>Address</strong>
              <span>
                {profile.address || '--'}
              </span>
            </div>

            <div>
              <strong>
                Emergency Contact
              </strong>

              <span>
                {profile.emergency_contact_name ||
                profile.emergency_contact_phone
                  ? `${profile.emergency_contact_name || '--'} / ${
                      profile.emergency_contact_phone ||
                      '--'
                    }`
                  : '--'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;