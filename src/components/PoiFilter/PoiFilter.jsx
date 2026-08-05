import React from "react";
import {
  Utensils,
  Pill,
  Landmark,
  Cross,
  Trees,
  ShoppingCart,
} from "lucide-react";
import { POI_CATEGORIES } from "../../services/geoapifyService";
import styles from "./PoiFilter.module.css";

const ICON_MAP = {
  Utensils,
  Pill,
  Landmark,
  Cross,
  Trees,
  ShoppingCart,
};

const PoiFilter = ({ selectedCategory, onSelectCategory }) => {
  return (
    <div className={styles.filterContainer}>
      {POI_CATEGORIES.map((cat) => {
        const IconComponent = ICON_MAP[cat.iconName];
        const isActive = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            className={isActive ? styles.activeButton : styles.button}
            onClick={() => onSelectCategory(cat.id)}
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
