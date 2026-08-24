import React, { useEffect, useState } from "react";
import { MapPinned } from "lucide-react";
import { ICON_MAP } from "../../utils/mapMarkers";
import {
  fetchPoisByCategory,
  POI_CATEGORIES,
} from "../../services/geoapifyService";
import styles from "./PoiResponse.module.css";

const SKELETON_ROWS = [1, 2, 3, 4, 5];

const PoiResponse = ({ selectedCategory, onSelectPlace }) => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadPlaces() {
      if (!selectedCategory) {
        setPlaces([]);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      setActiveId(null);

      try {
        const results = await fetchPoisByCategory(selectedCategory);
        if (!isCancelled) setPlaces(results);
      } catch (error) {
        console.error("PoiResponse yuklenme xetasi:", error);
        if (!isCancelled) setErrorMessage("Nəticələr yüklənmədi");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadPlaces();

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory]);

  if (!selectedCategory) return null;

  const category = POI_CATEGORIES.find((c) => c.id === selectedCategory);
  const IconComponent = category ? ICON_MAP[category.iconName] : MapPinned;
  const color = category?.color || "#7f8c8d";

  const handleSelect = (place) => {
    setActiveId(place.id);
    onSelectPlace({
      id: place.id,
      lat: place.lat,
      lon: place.lon,
      name: place.name,
    });
  };

  return (
    <div className={styles.responseContainer}>
      <div className={styles.responseHeader}>
        <span
          className={styles.headerIcon}
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <IconComponent size={15} strokeWidth={2.4} />
        </span>
        <span className={styles.headerTitle}>{category?.label}</span>
        {!loading && !errorMessage && (
          <span className={styles.headerCount}>{places.length}</span>
        )}
      </div>
      {loading && (
        <div className={styles.list}>
          {SKELETON_ROWS.map((row) => (
            <div key={row} className={styles.skeletonRow}>
              <span className={styles.skeletonIcon} />
              <span className={styles.skeletonLines}>
                <span
                  className={styles.skeletonLine}
                  style={{ width: "70%" }}
                />
                <span
                  className={styles.skeletonLine}
                  style={{ width: "45%" }}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && errorMessage && (
        <div className={styles.emptyState}>{errorMessage}</div>
      )}

      {!loading && !errorMessage && places.length === 0 && (
        <div className={styles.emptyState}>Bu ərazidə nəticə tapılmadı</div>
      )}

      {!loading && !errorMessage && places.length > 0 && (
        <div className={styles.list}>
          {places.map((place) => {
            const isActive = activeId === place.id;
            return (
              <button
                key={place.id}
                className={isActive ? styles.itemActive : styles.item}
                onClick={() => handleSelect(place)}
              >
                <span
                  className={styles.itemIcon}
                  style={{
                    backgroundColor: isActive ? "#ffffff33" : `${color}1a`,
                    color: isActive ? "#ffffff" : color,
                  }}
                >
                  <IconComponent size={16} strokeWidth={2.3} />
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{place.name}</span>
                  {place.address && (
                    <span className={styles.itemAddress}>{place.address}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PoiResponse;
