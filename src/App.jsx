import { useState } from "react";
import Map from "./components/Map/Map";
import PoiFilter from "./components/PoiFilter/PoiFilter";
import PoiResponse from "./components/PoiResponse/PoiResponse";
import PoiSearch from "./components/PoiSearch/PoiSearch";
import PointDetails from "./components/PointDetails/PointDetails";
import "./App.css";

function App() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [zoomTarget, setZoomTarget] = useState(null);

  return (
    <div className="App">
      <div className="topControls">
        <div>
          <p className="appTitle">Bakı şəhəri üçün maraq nöqtələri</p>
        </div>
        <PoiSearch
          onSelectPlace={setSelectedPlace}
          selectedPlace={selectedPlace}
        />
        {selectedPlace ? (
          <PointDetails
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
          />
        ) : (
          <>
            <PoiFilter
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            <PoiResponse
              selectedCategory={selectedCategory}
              onSelectPlace={setZoomTarget}
            />
          </>
        )}
      </div>
      <Map
        selectedCategory={selectedCategory}
        selectedPlace={selectedPlace}
        onSelectPlace={setSelectedPlace}
        zoomTarget={zoomTarget}
      />
    </div>
  );
}

export default App;
