import React, { useEffect, useRef, useState } from "react";
import { searchPlacesByText } from "../../services/geoapifyService";
import styles from "./PoiSearch.module.css";

const SKELETON_ROWS = [1, 2, 3];

const PoiSearch = ({ onSelectPlace, selectedPlace }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);
  const skipNextSearchRef = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const places = await searchPlacesByText(query);
        setResults(places);
        setIsOpen(true);
      } catch (err) {
        console.error("Axtaris xetasi:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (selectedPlace) {
      setIsOpen(false);
      const timeoutId = setTimeout(() => {
        inputRef.current?.blur();
      }, 0);
      return () => clearTimeout(timeoutId);
    } else {
      setQuery("");
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      inputRef.current?.blur();
    }
  }, [selectedPlace]);

  const handleSelect = (place) => {
    skipNextSearchRef.current = true;
    setQuery(place.name);
    setIsOpen(false);
    onSelectPlace(place);
    setTimeout(() => {
      inputRef.current?.blur();
    }, 0);
  };

  return (
    <div className={styles.searchContainer}>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder="Məkan axtarın..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => (results.length > 0 || isLoading) && setIsOpen(true)}
        autoComplete="new-password"
        name="poi-search-no-autofill"
      />

      {isOpen && isLoading && (
        <ul className={styles.dropdown}>
          {SKELETON_ROWS.map((row) => (
            <li key={row} className={styles.skeletonItem}>
              <span className={styles.skeletonLine} style={{ width: "65%" }} />
              <span className={styles.skeletonLine} style={{ width: "40%" }} />
            </li>
          ))}
        </ul>
      )}

      {isOpen && !isLoading && results.length > 0 && (
        <ul className={styles.dropdown}>
          {results.map((place) => (
            <li
              key={place.id}
              className={styles.dropdownItem}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(place)}
            >
              <span className={styles.itemName}>{place.name}</span>
              {place.address && (
                <span className={styles.itemAddress}>{place.address}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen &&
        !isLoading &&
        query.trim().length >= 2 &&
        results.length === 0 && (
          <ul className={styles.dropdown}>
            <li className={styles.emptyItem}>Nəticə tapılmadı</li>
          </ul>
        )}
    </div>
  );
};

export default PoiSearch;
