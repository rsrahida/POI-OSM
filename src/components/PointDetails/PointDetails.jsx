import React, { useEffect, useState } from "react";
import {
  X,
  MapPin,
  Phone,
  Globe,
  Clock,
  Navigation,
  AlertTriangle,
  MapPinOff,
  Loader2,
} from "lucide-react";
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

  const hasCoords = details && details.lat != null && details.lon != null;

  return (
    <div className={styles.panel}>
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Bağla"
      >
        <X size={16} strokeWidth={2.4} />
      </button>

      <div className={styles.header}>
        <div className={styles.iconBadge}>
          <MapPin size={20} strokeWidth={2.2} color="#fff" />
        </div>
        <div>
          <h3 className={styles.title}>{place.name}</h3>
          {place.category && (
            <span className={styles.subtitle}>{place.category}</span>
          )}
        </div>
      </div>

      {loading && (
        <div className={styles.loadingWrap}>
          <Loader2 size={16} className={styles.spinnerIcon} />
          <p className={styles.loading}>Yüklənir...</p>
        </div>
      )}

      {error && (
        <p className={styles.error}>
          <AlertTriangle size={15} strokeWidth={2.2} />
          {error}
        </p>
      )}

      {details && (
        <div className={styles.detailsList}>
          {details.address && (
            <div className={styles.card}>
              <span className={styles.cardIcon}>
                <MapPin size={16} strokeWidth={2} />
              </span>
              <div className={styles.cardBody}>
                <span className={styles.label}>Ünvan</span>
                <span className={styles.value}>{details.address}</span>
              </div>
            </div>
          )}

          {hasCoords && (
            <div className={styles.card}>
              <span className={styles.cardIcon}>
                <Navigation size={16} strokeWidth={2} />
              </span>
              <div className={styles.cardBody}>
                <span className={styles.label}>Koordinatlar</span>
                <span className={styles.value}>
                  <a
                    href={`https://www.google.com/maps?q=${details.lat},${details.lon}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {details.lat.toFixed(6)}, {details.lon.toFixed(6)}
                  </a>
                </span>
              </div>
            </div>
          )}
          {details.phone && (
            <div className={styles.card}>
              <span className={styles.cardIcon}>
                <Phone size={16} strokeWidth={2} />
              </span>
              <div className={styles.cardBody}>
                <span className={styles.label}>Telefon</span>
                <span className={styles.value}>
                  <a href={`tel:${details.phone}`}>{details.phone}</a>
                </span>
              </div>
            </div>
          )}

          {details.website && (
            <div className={styles.card}>
              <span className={styles.cardIcon}>
                <Globe size={16} strokeWidth={2} />
              </span>
              <div className={styles.cardBody}>
                <span className={styles.label}>Sayt</span>
                <span className={styles.value}>
                  <a href={details.website} target="_blank" rel="noreferrer">
                    {details.website}
                  </a>
                </span>
              </div>
            </div>
          )}

          {details.openingHours && (
            <div className={styles.card}>
              <span className={styles.cardIcon}>
                <Clock size={16} strokeWidth={2} />
              </span>
              <div className={styles.cardBody}>
                <span className={styles.label}>İş saatları</span>
                <span className={styles.value}>{details.openingHours}</span>
              </div>
            </div>
          )}

          {!details.address &&
            !hasCoords &&
            !details.phone &&
            !details.website &&
            !details.openingHours && (
              <div className={styles.emptyState}>
                <MapPinOff
                  size={26}
                  strokeWidth={1.6}
                  className={styles.emptyIcon}
                />
                <p className={styles.noData}>
                  Bu məkan üçün əlavə məlumat tapılmadı.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default PointDetails;
