import React from "react";
import { ICON_MAP } from "../../utils/mapMarkers";
import { POI_CATEGORIES } from "../../services/geoapifyService";
import styles from "./PoiFilter.module.css";

const PoiFilter = ({ selectedCategory, onSelectCategory }) => {
  const handleClick = (catId) => {
    if (selectedCategory === catId) {
      onSelectCategory(null);
    } else {
      onSelectCategory(catId);
    }
  };

  return (
    <div className={styles.filterContainer}>
      {POI_CATEGORIES.map((cat) => {
        const IconComponent = ICON_MAP[cat.iconName];
        const isActive = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            className={isActive ? styles.activeButton : styles.button}
            onClick={() => handleClick(cat.id)}
          >
            <span
              className={styles.iconBadge}
              style={{
                backgroundColor: isActive ? "#ffffff" : `${cat.color}22`,
              }}
            >
              <IconComponent size={22} color={cat.color} strokeWidth={2} />
            </span>
            <span className={styles.label}>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PoiFilter;
