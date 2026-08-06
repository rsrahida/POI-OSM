import React, { useEffect, useRef, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Extent from "@arcgis/core/geometry/Extent";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import { Map as MapIcon, Satellite, Group, Boxes } from "lucide-react";
import { fetchPoisByCategory } from "../../services/geoapifyService";
import {
  buildCategoryRenderer,
  getSearchMarkerSymbol,
} from "../../utils/mapMarkers";
import styles from "./Map.module.css";

const VECTOR_BASEMAP = "streets-navigation-vector";
const HYBRID_BASEMAP = "hybrid";

const CLUSTER_CONFIG = {
  type: "cluster",
  clusterRadius: "80px",
  popupEnabled: false,
  clusterMinSize: "24px",
  clusterMaxSize: "60px",
  labelingInfo: [
    {
      deconflictionStrategy: "none",
      labelExpressionInfo: {
        expression: "Text($feature.cluster_count, '#,###')",
      },
      symbol: {
        type: "text",
        color: "#ffffff",
        font: { weight: "bold", size: "10px" },
        yoffset: -5,
      },
      labelPlacement: "center-center",
    },
  ],
};

const MapComponent = ({
  selectedCategory,
  selectedPlace,
  onSelectPlace,
  zoomTarget,
}) => {
  const mapDiv = useRef(null);
  const viewRef = useRef(null);
  const poiLayerRef = useRef(null);
  const searchLayerRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isHybrid, setIsHybrid] = useState(false);
  const [isClustered, setIsClustered] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);

  const [activeLabel, setActiveLabel] = useState(null);
  const activeLabelRef = useRef(null);
  useEffect(() => {
    activeLabelRef.current = activeLabel;
  }, [activeLabel]);

  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

  useEffect(() => {
    if (mapDiv.current) {
      const searchLayer = new GraphicsLayer();
      searchLayerRef.current = searchLayer;

      const poiLayer = new FeatureLayer({
        source: [],
        fields: [
          { name: "ObjectID", alias: "ObjectID", type: "oid" },
          { name: "placeId", alias: "placeId", type: "string" },
          { name: "name", alias: "name", type: "string" },
          { name: "lat", alias: "lat", type: "double" },
          { name: "lon", alias: "lon", type: "double" },
          { name: "category", alias: "category", type: "string" },
        ],
        objectIdField: "ObjectID",
        geometryType: "point",
        spatialReference: { wkid: 4326 },
        renderer: buildCategoryRenderer(),
      });
      poiLayerRef.current = poiLayer;

      const map = new Map({
        basemap: VECTOR_BASEMAP,
        layers: [poiLayer, searchLayer],
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

      view.when(() => {
        setIsMapLoading(false);
      });

      view.on("click", (event) => {
        view.hitTest(event).then((response) => {
          const graphicHit = response.results.find(
            (result) => result.graphic && result.graphic.attributes?.placeId,
          );

          if (!graphicHit) {
            setActiveLabel(null);
            return;
          }

          const { graphic } = graphicHit;
          const attrs = graphic.attributes;

          if (graphic.layer === searchLayerRef.current) {
            setActiveLabel(null);
            onSelectPlaceRef.current({
              id: attrs.placeId,
              lat: attrs.lat,
              lon: attrs.lon,
              name: attrs.name,
            });
          } else if (graphic.layer === poiLayerRef.current) {
            const screenPoint = view.toScreen(graphic.geometry);
            setActiveLabel({
              name: attrs.name,
              mapPoint: graphic.geometry,
              x: screenPoint.x,
              y: screenPoint.y,
            });
          }
        });
      });

      const extentWatch = view.watch("extent", () => {
        const current = activeLabelRef.current;
        if (!current || !viewRef.current) return;
        const screenPoint = viewRef.current.toScreen(current.mapPoint);
        setActiveLabel((prev) =>
          prev ? { ...prev, x: screenPoint.x, y: screenPoint.y } : prev,
        );
      });

      viewRef.current = view;

      return () => {
        extentWatch.remove();
      };
    }
  }, []);

  useEffect(() => {
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
      if (!selectedCategory || !poiLayerRef.current) return;

      setErrorMessage(null);
      setActiveLabel(null);

      try {
        const pois = await fetchPoisByCategory(selectedCategory);

        if (isCancelled) return;

        const layer = poiLayerRef.current;

        const existing = await layer.queryFeatures();
        const deleteFeatures = existing.features;

        const addFeatures = pois.map((poi, index) => ({
          geometry: new Point({ longitude: poi.lon, latitude: poi.lat }),
          attributes: {
            ObjectID: index + 1,
            placeId: poi.id,
            name: poi.name,
            lat: poi.lat,
            lon: poi.lon,
            category: selectedCategory,
          },
        }));

        await layer.applyEdits({ deleteFeatures, addFeatures });
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
    setActiveLabel(null);

    const point = new Point({
      longitude: selectedPlace.lon,
      latitude: selectedPlace.lat,
    });

    const graphic = new Graphic({
      geometry: point,
      symbol: getSearchMarkerSymbol(),
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

  useEffect(() => {
    if (!zoomTarget || !viewRef.current) return;

    const point = new Point({
      longitude: zoomTarget.lon,
      latitude: zoomTarget.lat,
    });

    viewRef.current
      .goTo({ center: [zoomTarget.lon, zoomTarget.lat], zoom: 16 })
      .then(() => {
        if (!viewRef.current) return;
        const screenPoint = viewRef.current.toScreen(point);
        setActiveLabel({
          name: zoomTarget.name,
          mapPoint: point,
          x: screenPoint.x,
          y: screenPoint.y,
        });
      });
  }, [zoomTarget]);

  const toggleBasemap = () => {
    if (!viewRef.current) return;
    const next = isHybrid ? VECTOR_BASEMAP : HYBRID_BASEMAP;
    viewRef.current.map.basemap = next;
    setIsHybrid(!isHybrid);
  };

  const toggleCluster = () => {
    if (!poiLayerRef.current) return;
    const next = !isClustered;
    poiLayerRef.current.featureReduction = next ? CLUSTER_CONFIG : null;
    setIsClustered(next);
    setActiveLabel(null);
  };

  return (
    <div className={styles.mapWrapper}>
      <div className={styles.mapContainer} ref={mapDiv} />

      {isMapLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
        </div>
      )}

      <div className={styles.toolbar}>
        <button
          className={styles.toolButton}
          onClick={toggleBasemap}
          title={isHybrid ? "Vektor rejimə keç" : "Peyk rejiminə keç"}
        >
          <span className={styles.toolIcon}>
            {isHybrid ? (
              <MapIcon size={16} strokeWidth={2.2} />
            ) : (
              <Satellite size={16} strokeWidth={2.2} />
            )}
          </span>
          {isHybrid ? "Vektor" : "Peyk"}
        </button>

        <div className={styles.toolDivider} />

        <button
          className={isClustered ? styles.toolButtonActive : styles.toolButton}
          onClick={toggleCluster}
          title={isClustered ? "Klasterləməni bağla" : "Klasterləməni aç"}
        >
          <span className={styles.toolIcon}>
            {isClustered ? (
              <Boxes size={16} strokeWidth={2.2} />
            ) : (
              <Group size={16} strokeWidth={2.2} />
            )}
          </span>
          Klaster
        </button>
      </div>

      {activeLabel && (
        <div
          className={styles.nameLabel}
          style={{
            left: activeLabel.x,
            top: activeLabel.y,
          }}
        >
          {activeLabel.name}
        </div>
      )}

      {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
    </div>
  );
};

export default MapComponent;
