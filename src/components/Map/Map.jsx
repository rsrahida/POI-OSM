import React, { useEffect, useRef, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Extent from "@arcgis/core/geometry/Extent";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";
import Polyline from "@arcgis/core/geometry/Polyline";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import {
  Map as MapIcon,
  Satellite,
  Group,
  Boxes,
  LocateFixed,
  Circle,
  Hexagon,
  X,
} from "lucide-react";
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

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  const userLocationLayerRef = useRef(null);
  const bufferLayerRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isHybrid, setIsHybrid] = useState(false);
  const [isClustered, setIsClustered] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [activeLabel, setActiveLabel] = useState(null);
  const [pois, setPois] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const activeLabelRef = useRef(null);

  const [isBufferMode, setIsBufferMode] = useState(false);
  const [bufferRadius, setBufferRadius] = useState(500);
  const [bufferCenter, setBufferCenter] = useState(null);
  const [poisInBuffer, setPoisInBuffer] = useState([]);
  const isBufferModeRef = useRef(false);
  useEffect(() => {
    isBufferModeRef.current = isBufferMode;
  }, [isBufferMode]);

  const [isPolygonMode, setIsPolygonMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [isPolygonFinished, setIsPolygonFinished] = useState(false);
  const [poisInPolygon, setPoisInPolygon] = useState([]);
  const polygonLayerRef = useRef(null);
  const isPolygonModeRef = useRef(false);
  const isPolygonFinishedRef = useRef(false);

  useEffect(() => {
    isPolygonModeRef.current = isPolygonMode;
  }, [isPolygonMode]);

  useEffect(() => {
    isPolygonFinishedRef.current = isPolygonFinished;
  }, [isPolygonFinished]);

  useEffect(() => {
    activeLabelRef.current = activeLabel;
  }, [activeLabel]);

  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrorMessage("Bu brauzer mövqe müəyyənləşdirməni dəstəkləmir");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Geolocation xetasi:", error);
        setErrorMessage("Mövqeyə giriş icazəsi verilmədi");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (mapDiv.current) {
      const searchLayer = new GraphicsLayer();
      searchLayerRef.current = searchLayer;

      const userLocationLayer = new GraphicsLayer();
      userLocationLayerRef.current = userLocationLayer;

      const bufferLayer = new GraphicsLayer();
      bufferLayerRef.current = bufferLayer;

      const polygonLayer = new GraphicsLayer();
      polygonLayerRef.current = polygonLayer;

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
        layers: [
          poiLayer,
          searchLayer,
          userLocationLayer,
          bufferLayer,
          polygonLayer,
        ],
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
        if (isBufferModeRef.current) {
          const mapPoint = view.toMap({ x: event.x, y: event.y });
          setBufferCenter({
            lat: mapPoint.latitude,
            lon: mapPoint.longitude,
          });
          return;
        }
        if (isPolygonModeRef.current) {
          if (isPolygonFinishedRef.current) return;
          const mapPoint = view.toMap({ x: event.x, y: event.y });
          setPolygonPoints((prev) => [
            ...prev,
            { lat: mapPoint.latitude, lon: mapPoint.longitude },
          ]);
          return;
        }

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
        const fetchedPois = await fetchPoisByCategory(selectedCategory);
        if (isCancelled) return;
        setPois(fetchedPois);

        const layer = poiLayerRef.current;
        const existing = await layer.queryFeatures();
        const deleteFeatures = existing.features;

        const addFeatures = fetchedPois.map((poi, index) => ({
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
      setPois([]);
      setIsBufferMode(false);
      setBufferCenter(null);
      setPoisInBuffer([]);
      if (bufferLayerRef.current) bufferLayerRef.current.removeAll();
      setIsPolygonMode(false);
      setPolygonPoints([]);
      setIsPolygonFinished(false);
      setPoisInPolygon([]);
      if (polygonLayerRef.current) polygonLayerRef.current.removeAll();
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

  useEffect(() => {
    if (!userLocation || !userLocationLayerRef.current) return;

    userLocationLayerRef.current.removeAll();

    const point = new Point({
      longitude: userLocation.lon,
      latitude: userLocation.lat,
    });

    const graphic = new Graphic({
      geometry: point,
      symbol: {
        type: "simple-marker",
        style: "circle",
        color: [66, 133, 244, 0.9],
        size: 12,
        outline: { color: [255, 255, 255, 1], width: 2 },
      },
    });

    userLocationLayerRef.current.add(graphic);
  }, [userLocation]);

  useEffect(() => {
    if (!bufferCenter || !bufferLayerRef.current) {
      if (bufferLayerRef.current) bufferLayerRef.current.removeAll();
      setPoisInBuffer([]);
      return;
    }

    bufferLayerRef.current.removeAll();

    const centerPoint = new Point({
      longitude: bufferCenter.lon,
      latitude: bufferCenter.lat,
    });

    const bufferPolygon = geometryEngine.geodesicBuffer(
      centerPoint,
      bufferRadius,
      "meters",
    );

    const bufferGraphic = new Graphic({
      geometry: bufferPolygon,
      symbol: {
        type: "simple-fill",
        color: [255, 140, 0, 0.12],
        outline: { color: [255, 140, 0, 0.9], width: 2 },
      },
    });

    const centerGraphic = new Graphic({
      geometry: centerPoint,
      symbol: {
        type: "simple-marker",
        style: "x",
        color: [255, 140, 0, 1],
        size: 10,
        outline: { color: [255, 255, 255, 1], width: 1.5 },
      },
    });

    bufferLayerRef.current.addMany([bufferGraphic, centerGraphic]);

    const inside = [];
    for (const poi of pois) {
      const poiPoint = new Point({ longitude: poi.lon, latitude: poi.lat });
      if (geometryEngine.contains(bufferPolygon, poiPoint)) {
        inside.push(poi);
      }
    }
    setPoisInBuffer(inside);
  }, [bufferCenter, bufferRadius, pois]);

  useEffect(() => {
    if (!isBufferMode) {
      if (bufferLayerRef.current) bufferLayerRef.current.removeAll();
      setBufferCenter(null);
      setPoisInBuffer([]);
    }
  }, [isBufferMode]);
  useEffect(() => {
    if (!polygonLayerRef.current) return;

    polygonLayerRef.current.removeAll();

    if (polygonPoints.length === 0) {
      setPoisInPolygon([]);
      return;
    }

    if (isPolygonFinished && polygonPoints.length >= 3) {
      const rings = [
        ...polygonPoints.map((pt) => [pt.lon, pt.lat]),
        [polygonPoints[0].lon, polygonPoints[0].lat],
      ];

      const polygon = new Polygon({
        rings: [rings],
        spatialReference: { wkid: 4326 },
      });

      const fillGraphic = new Graphic({
        geometry: polygon,
        symbol: {
          type: "simple-fill",
          color: [155, 89, 182, 0.15],
          outline: { color: [155, 89, 182, 0.9], width: 2 },
        },
      });
      const vertexGraphics = polygonPoints.map(
        (pt) =>
          new Graphic({
            geometry: new Point({ longitude: pt.lon, latitude: pt.lat }),
            symbol: {
              type: "simple-marker",
              style: "circle",
              color: [155, 89, 182, 1],
              size: 7,
              outline: { color: [255, 255, 255, 1], width: 1.5 },
            },
          }),
      );

      polygonLayerRef.current.addMany([fillGraphic, ...vertexGraphics]);

      const inside = [];
      for (const poi of pois) {
        const poiPoint = new Point({ longitude: poi.lon, latitude: poi.lat });
        if (geometryEngine.contains(polygon, poiPoint)) {
          inside.push(poi);
        }
      }
      setPoisInPolygon(inside);
    } else {
      polygonPoints.forEach((pt) => {
        const marker = new Graphic({
          geometry: new Point({ longitude: pt.lon, latitude: pt.lat }),
          symbol: {
            type: "simple-marker",
            style: "circle",
            color: [155, 89, 182, 1],
            size: 9,
            outline: { color: [255, 255, 255, 1], width: 1.5 },
          },
        });
        polygonLayerRef.current.add(marker);
      });

      if (polygonPoints.length >= 2) {
        const pathCoords = polygonPoints.map((pt) => [pt.lon, pt.lat]);

        const line = new Polyline({
          paths: [pathCoords],
          spatialReference: { wkid: 4326 },
        });

        const lineGraphic = new Graphic({
          geometry: line,
          symbol: {
            type: "simple-line",
            color: [155, 89, 182, 0.9],
            width: 2,
          },
        });
        polygonLayerRef.current.add(lineGraphic);

        if (polygonPoints.length >= 3) {
          const closingLine = new Polyline({
            paths: [
              [
                [
                  polygonPoints[polygonPoints.length - 1].lon,
                  polygonPoints[polygonPoints.length - 1].lat,
                ],
                [polygonPoints[0].lon, polygonPoints[0].lat],
              ],
            ],
            spatialReference: { wkid: 4326 },
          });

          const closingGraphic = new Graphic({
            geometry: closingLine,
            symbol: {
              type: "simple-line",
              color: [155, 89, 182, 0.4],
              width: 1.5,
              style: "dash",
            },
          });
          polygonLayerRef.current.add(closingGraphic);
        }
      }

      setPoisInPolygon([]);
    }
  }, [polygonPoints, isPolygonFinished, pois]);
  useEffect(() => {
    if (!isPolygonMode) {
      if (polygonLayerRef.current) polygonLayerRef.current.removeAll();
      setPolygonPoints([]);
      setIsPolygonFinished(false);
      setPoisInPolygon([]);
    }
  }, [isPolygonMode]);

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
  const toggleBufferMode = () => {
    setIsBufferMode((prev) => !prev);
    setIsPolygonMode(false);
  };

  const togglePolygonMode = () => {
    setIsPolygonMode((prev) => !prev);
    setIsBufferMode(false);
  };

  const goToNearestPoi = () => {
    if (!userLocation || pois.length === 0 || !viewRef.current) return;

    let nearest = null;
    let minDistance = Infinity;

    for (const poi of pois) {
      const distance = haversineDistance(
        userLocation.lat,
        userLocation.lon,
        poi.lat,
        poi.lon,
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = poi;
      }
    }

    if (!nearest) return;

    const point = new Point({ longitude: nearest.lon, latitude: nearest.lat });

    viewRef.current
      .goTo({ center: [nearest.lon, nearest.lat], zoom: 16 })
      .then(() => {
        if (!viewRef.current) return;
        const screenPoint = viewRef.current.toScreen(point);
        setActiveLabel({
          name: nearest.name,
          mapPoint: point,
          x: screenPoint.x,
          y: screenPoint.y,
        });
      });
  };

  const clearBuffer = () => {
    setBufferCenter(null);
    setPoisInBuffer([]);
    if (bufferLayerRef.current) bufferLayerRef.current.removeAll();
  };

  const handleBufferPoiClick = (poi) => {
    if (!viewRef.current) return;
    const point = new Point({ longitude: poi.lon, latitude: poi.lat });
    viewRef.current.goTo({ center: [poi.lon, poi.lat], zoom: 17 }).then(() => {
      if (!viewRef.current) return;
      const screenPoint = viewRef.current.toScreen(point);
      setActiveLabel({
        name: poi.name,
        mapPoint: point,
        x: screenPoint.x,
        y: screenPoint.y,
      });
    });
  };

  const undoLastPolygonPoint = () => {
    setPolygonPoints((prev) => prev.slice(0, -1));
  };

  const finishPolygon = () => {
    if (polygonPoints.length < 3) return;
    setIsPolygonFinished(true);
  };

  const clearPolygon = () => {
    setPolygonPoints([]);
    setIsPolygonFinished(false);
    setPoisInPolygon([]);
    if (polygonLayerRef.current) polygonLayerRef.current.removeAll();
  };

  const handlePolygonPoiClick = (poi) => {
    if (!viewRef.current) return;
    const point = new Point({ longitude: poi.lon, latitude: poi.lat });
    viewRef.current.goTo({ center: [poi.lon, poi.lat], zoom: 17 }).then(() => {
      if (!viewRef.current) return;
      const screenPoint = viewRef.current.toScreen(point);
      setActiveLabel({
        name: poi.name,
        mapPoint: point,
        x: screenPoint.x,
        y: screenPoint.y,
      });
    });
  };

  const nearestDisabled =
    !selectedCategory || !userLocation || pois.length === 0;
  const nearestTitle = !selectedCategory
    ? "Əvvəlcə kateqoriya seçin"
    : !userLocation
      ? "Mövqe icazəsi lazımdır"
      : pois.length === 0
        ? "Bu kateqoriyada nəticə yoxdur"
        : "Ən yaxın nöqtəyə get";
  const bufferModeDisabled = !selectedCategory;
  const polygonModeDisabled = !selectedCategory;

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
        <div className={styles.toolDivider} />
        <button
          className={isBufferMode ? styles.toolButtonActive : styles.toolButton}
          onClick={toggleBufferMode}
          disabled={bufferModeDisabled}
          title={
            bufferModeDisabled
              ? "Əvvəlcə kateqoriya seçin"
              : isBufferMode
                ? "Dairə rejimini bağla"
                : "Dairə analizi başlat"
          }
          style={
            bufferModeDisabled
              ? { opacity: 0.45, cursor: "not-allowed" }
              : undefined
          }
        >
          <span className={styles.toolIcon}>
            <Circle size={16} strokeWidth={2.2} />
          </span>
          Dairə
        </button>
        <div className={styles.toolDivider} />
        <button
          className={
            isPolygonMode ? styles.toolButtonActive : styles.toolButton
          }
          onClick={togglePolygonMode}
          disabled={polygonModeDisabled}
          title={
            polygonModeDisabled
              ? "Əvvəlcə kateqoriya seçin"
              : isPolygonMode
                ? "Poliqon rejimini bağla"
                : "Poliqon analizi başlat"
          }
          style={
            polygonModeDisabled
              ? { opacity: 0.45, cursor: "not-allowed" }
              : undefined
          }
        >
          <span className={styles.toolIcon}>
            <Hexagon size={16} strokeWidth={2.2} />
          </span>
          Poliqon
        </button>
        <div className={styles.toolDivider} />
        <button
          className={styles.toolButton}
          onClick={goToNearestPoi}
          disabled={nearestDisabled}
          title={nearestTitle}
          style={
            nearestDisabled
              ? { opacity: 0.45, cursor: "not-allowed" }
              : undefined
          }
        >
          <span className={styles.toolIcon}>
            <LocateFixed size={16} strokeWidth={2.2} />
          </span>
          Yaxın
        </button>
      </div>

      {isBufferMode && (
        <div className={styles.bufferRadiusBar}>
          {[500, 1000, 3000].map((radius) => (
            <button
              key={radius}
              className={
                bufferRadius === radius
                  ? styles.toolButtonActive
                  : styles.toolButton
              }
              onClick={() => setBufferRadius(radius)}
            >
              {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}
            </button>
          ))}
        </div>
      )}

      {isBufferMode && !bufferCenter && (
        <div className={styles.bufferHintBanner}>
          Dairənin mərkəzini təyin etmək üçün xəritəyə basın
        </div>
      )}
      {isBufferMode && bufferCenter && (
        <div className={styles.bufferPanel}>
          <div className={styles.bufferPanelHeader}>
            <div>
              <div className={styles.bufferPanelTitle}>
                {poisInBuffer.length} nəticə tapıldı
              </div>
              <div className={styles.bufferPanelSubtitle}>
                {bufferRadius >= 1000
                  ? `${bufferRadius / 1000}km radiusda`
                  : `${bufferRadius}m radiusda`}
              </div>
            </div>
            <button
              className={styles.bufferPanelClose}
              onClick={clearBuffer}
              title="Dairəni sil"
            >
              <X size={14} />
            </button>
          </div>

          {poisInBuffer.length === 0 ? (
            <div className={styles.bufferEmptyState}>
              Bu dairə daxilində nəticə tapılmadı
            </div>
          ) : (
            <div className={styles.bufferList}>
              {poisInBuffer.map((poi) => (
                <button
                  key={poi.id}
                  className={styles.bufferListItem}
                  onClick={() => handleBufferPoiClick(poi)}
                >
                  <span className={styles.bufferListItemDot} />
                  {poi.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {isPolygonMode && !isPolygonFinished && (
        <div className={styles.bufferRadiusBar}>
          <button
            className={styles.toolButton}
            onClick={undoLastPolygonPoint}
            disabled={polygonPoints.length === 0}
            title="Son nöqtəni sil"
            style={
              polygonPoints.length === 0
                ? { opacity: 0.45, cursor: "not-allowed" }
                : undefined
            }
          >
            Geri al
          </button>
          <button
            className={styles.toolButton}
            onClick={finishPolygon}
            disabled={polygonPoints.length < 3}
            title={
              polygonPoints.length < 3
                ? "Minimum 3 nöqtə lazımdır"
                : "Poliqonu bağla"
            }
            style={
              polygonPoints.length < 3
                ? { opacity: 0.45, cursor: "not-allowed" }
                : undefined
            }
          >
            Bitir
          </button>
          <button
            className={styles.toolButton}
            onClick={clearPolygon}
            disabled={polygonPoints.length === 0}
            title="Bütün nöqtələri sil"
            style={
              polygonPoints.length === 0
                ? { opacity: 0.45, cursor: "not-allowed" }
                : undefined
            }
          >
            Təmizlə
          </button>
        </div>
      )}

      {isPolygonMode && !isPolygonFinished && (
        <div className={styles.bufferHintBanner}>
          {polygonPoints.length < 3
            ? `Poliqonun künclərini işarələmək üçün xəritəyə basın (${polygonPoints.length}/3 minimum)`
            : `${polygonPoints.length} nöqtə seçildi — bağlamaq üçün "Bitir" düyməsinə basın`}
        </div>
      )}

      {isPolygonMode && isPolygonFinished && (
        <div className={styles.bufferPanel}>
          <div className={styles.bufferPanelHeader}>
            <div>
              <div className={styles.bufferPanelTitle}>
                {poisInPolygon.length} nəticə tapıldı
              </div>
              <div className={styles.bufferPanelSubtitle}>
                {polygonPoints.length} nöqtəli poliqon
              </div>
            </div>
            <button
              className={styles.bufferPanelClose}
              onClick={clearPolygon}
              title="Poliqonu sil"
            >
              <X size={14} />
            </button>
          </div>

          {poisInPolygon.length === 0 ? (
            <div className={styles.bufferEmptyState}>
              Bu poliqon daxilində nəticə tapılmadı
            </div>
          ) : (
            <div className={styles.bufferList}>
              {poisInPolygon.map((poi) => (
                <button
                  key={poi.id}
                  className={styles.bufferListItem}
                  onClick={() => handlePolygonPoiClick(poi)}
                >
                  <span className={styles.bufferListItemDot} />
                  {poi.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
