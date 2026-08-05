import React, { useEffect, useRef, useState } from "react";
import { searchPlacesByText } from "../../services/geoapifyService";
import styles from "./PoiSearch.module.css";

const PoiSearch = ({ onSelectPlace }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const places = await searchPlacesByText(query);
        setResults(places);
        setIsOpen(true);
      } catch (err) {
        console.error("Axtaris xetasi:", err);
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (place) => {
    setQuery(place.name);
    setIsOpen(false);
    onSelectPlace(place);
  };

  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        className={styles.input}
        placeholder="Mekan axtar..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
      />

      {isOpen && results.length > 0 && (
        <ul className={styles.dropdown}>
          {results.map((place) => (
            <li
              key={place.id}
              className={styles.dropdownItem}
              onClick={() => handleSelect(place)}
            >
              {place.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PoiSearch;