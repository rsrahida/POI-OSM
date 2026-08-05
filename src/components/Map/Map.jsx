import React, { useEffect, useRef, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Extent from "@arcgis/core/geometry/Extent";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import { fetchPoisByCategory } from "../../services/geoapifyService";
import styles from "./Map.module.css";

const MapComponent = ({ selectedCategory, selectedPlace, onSelectPlace }) => {
  const mapDiv = useRef(null);
  const viewRef = useRef(null);
  const graphicsLayerRef = useRef(null);
  const searchLayerRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

  useEffect(() => {
    if (mapDiv.current) {
      const graphicsLayer = new GraphicsLayer();
      const searchLayer = new GraphicsLayer();
      graphicsLayerRef.current = graphicsLayer;
      searchLayerRef.current = searchLayer;

      const map = new Map({
        basemap: "streets-navigation-vector",
        layers: [graphicsLayer, searchLayer],
      });

      const bakuExtent = new Extent({
        xmin: 49.3,
        ymin: 40.25,
        xmax: 50.4,
        ymax: 40.65,
        spatialReference: { wkid: 4326 },
      });

      const view = new MapView({
        container: mapDiv.current,
        map: map,
        extent: bakuExtent,
        popupEnabled: false,
        constraints: {
          geometry: bakuExtent,
          minZoom: 9,
          rotationEnabled: false,
        },
      });

      view.on("click", (event) => {
        view.hitTest(event).then((response) => {
          const graphicHit = response.results.find(
            (result) => result.graphic && result.graphic.attributes?.placeId,
          );

          if (graphicHit) {
            const attrs = graphicHit.graphic.attributes;
            onSelectPlaceRef.current({
              id: attrs.placeId,
              lat: attrs.lat,
              lon: attrs.lon,
              name: attrs.name,
            });
          }
        });
      });

      viewRef.current = view;
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadPois() {
      if (!selectedCategory || !graphicsLayerRef.current) return;

      graphicsLayerRef.current.removeAll();
      setErrorMessage(null);

      try {
        const pois = await fetchPoisByCategory(selectedCategory);

        if (isCancelled) return;

        const markerSymbol = {
          type: "simple-marker",
          color: [226, 119, 40],
          outline: {
            color: [255, 255, 255],
            width: 1,
          },
          size: 8,
        };

        pois.forEach((poi) => {
          const point = new Point({
            longitude: poi.lon,
            latitude: poi.lat,
          });

          const graphic = new Graphic({
            geometry: point,
            symbol: markerSymbol,
            attributes: {
              placeId: poi.id,
              name: poi.name,
              lat: poi.lat,
              lon: poi.lon,
            },
          });

          graphicsLayerRef.current.add(graphic);
        });
      } catch (error) {
        console.error("POI cekilmesinde xeta:", error);
        if (!isCancelled) setErrorMessage(error.message);
      }
    }

    loadPois();

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedPlace || !viewRef.current || !searchLayerRef.current) return;

    searchLayerRef.current.removeAll();

    const point = new Point({
      longitude: selectedPlace.lon,
      latitude: selectedPlace.lat,
    });

    const searchMarkerSymbol = {
      type: "simple-marker",
      color: [30, 144, 255],
      outline: {
        color: [255, 255, 255],
        width: 2,
      },
      size: 12,
    };

    const graphic = new Graphic({
      geometry: point,
      symbol: searchMarkerSymbol,
      attributes: {
        placeId: selectedPlace.id,
        name: selectedPlace.name,
        lat: selectedPlace.lat,
        lon: selectedPlace.lon,
      },
    });

    searchLayerRef.current.add(graphic);

    viewRef.current.goTo({
      center: [selectedPlace.lon, selectedPlace.lat],
      zoom: 15,
    });
  }, [selectedPlace]);

  return (
    <div className={styles.mapContainer} ref={mapDiv}>
      {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
    </div>
  );
};

export default MapComponent;
