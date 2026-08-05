import { useState } from "react";
import Map from "./components/Map/Map";
import PoiFilter from "./components/PoiFilter/PoiFilter";
import PoiSearch from "./components/PoiSearch/PoiSearch";
import PointDetails from "./components/PointDetails/PointDetails";
import "./App.css";

function App() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);

  return (
    <div className="App">
      <div className="topControls">
        <div>
          <p className="appTitle">Bakı şəhəri üçün maraq nöqtələri</p>
        </div>
        <PoiSearch onSelectPlace={setSelectedPlace} />
        <PoiFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>
      <Map
        selectedCategory={selectedCategory}
        selectedPlace={selectedPlace}
        onSelectPlace={setSelectedPlace}
      />

      <PointDetails
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
      />
    </div>
  );
}

export default App;
