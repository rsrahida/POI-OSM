import React, { useEffect, useState } from "react";
import { fetchPlaceDetails } from "../../services/geoapifyService";
import styles from "./PointDetails.module.css";

const PointDetails = ({ place, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadDetails() {
      if (!place) return;

      setLoading(true);
      setError(null);
      setDetails(null);

      try {
        const result = await fetchPlaceDetails(place.id);
        if (!isCancelled) setDetails(result);
      } catch (err) {
        if (!isCancelled) setError(err.message);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [place]);

  if (!place) return null;

  return (
    <div className={styles.panel}>
      <button className={styles.closeButton} onClick={onClose}>
        ✕
      </button>

      <h3 className={styles.title}>{place.name}</h3>

      {loading && <p className={styles.loading}>Yüklənir...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {details && (
        <div className={styles.detailsList}>
          {details.address && (
            <div className={styles.row}>
              <span className={styles.label}>Ünvan:</span>
              <span>{details.address}</span>
            </div>
          )}
          {details.phone && (
            <div className={styles.row}>
              <span className={styles.label}>Telefon:</span>
              <span>{details.phone}</span>
            </div>
          )}
          {details.website && (
            <div className={styles.row}>
              <span className={styles.label}>Sayt:</span>
              <a href={details.website} target="_blank" rel="noreferrer">
                {details.website}
              </a>
            </div>
          )}
          {details.openingHours && (
            <div className={styles.row}>
              <span className={styles.label}>İş saatları:</span>
              <span>{details.openingHours}</span>
            </div>
          )}
          {!details.address &&
            !details.phone &&
            !details.website &&
            !details.openingHours && (
              <p className={styles.noData}>
                Bu mekan üçün əlavə məlumat tapılmadı.
              </p>
            )}
        </div>
      )}
    </div>
  );
};

export default PointDetails;