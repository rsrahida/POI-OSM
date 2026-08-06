import { renderToStaticMarkup } from "react-dom/server";
import {
  Utensils,
  Pill,
  Landmark,
  Cross,
  Trees,
  ShoppingCart,
  MapPin,
} from "lucide-react";
import { POI_CATEGORIES } from "../services/geoapifyService";

export const ICON_MAP = {
  Utensils,
  Pill,
  Landmark,
  Cross,
  Trees,
  ShoppingCart,
};

function svgToDataUrl(svgMarkup) {
  return `data:image/svg+xml;base64,${btoa(
    unescape(encodeURIComponent(svgMarkup)),
  )}`;
}

function buildCategoryPinSvg(IconComponent, color, size = 40) {
  const iconSize = Math.round(size * 0.34);
  const headCenterY = size * 0.4;

  const pinMarkup = renderToStaticMarkup(
    <MapPin
      width={size}
      height={size}
      color="#ffffff"
      fill={color}
      strokeWidth={1.5}
    />,
  );

  const iconMarkup = renderToStaticMarkup(
    <IconComponent size={iconSize} color="#ffffff" strokeWidth={2.6} />,
  );

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${pinMarkup}
      <g transform="translate(${size / 2 - iconSize / 2}, ${headCenterY - iconSize / 2})">
        ${iconMarkup}
      </g>
    </svg>
  `;
}

function buildSearchPinSvg(size = 40, color = "#dc2626") {
  return renderToStaticMarkup(
    <MapPin
      width={size}
      height={size}
      color="#ffffff"
      fill={color}
      strokeWidth={1.5}
    />,
  );
}

export function buildCategoryRenderer() {
  const uniqueValueInfos = POI_CATEGORIES.map((cat) => ({
    value: cat.id,
    symbol: {
      type: "picture-marker",
      url: svgToDataUrl(buildCategoryPinSvg(ICON_MAP[cat.iconName], cat.color)),
      width: "30px",
      height: "30px",
      yoffset: "8px",
    },
  }));

  return {
    type: "unique-value",
    field: "category",
    uniqueValueInfos,
    defaultSymbol: {
      type: "picture-marker",
      url: svgToDataUrl(buildCategoryPinSvg(MapPin, "#7f8c8d")),
      width: "28px",
      height: "28px",
      yoffset: "8px",
    },
  };
}

export function getSearchMarkerSymbol() {
  return {
    type: "picture-marker",
    url: svgToDataUrl(buildSearchPinSvg()),
    width: "36px",
    height: "36px",
    yoffset: "10px",
  };
}
