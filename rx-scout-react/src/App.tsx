import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import axios from 'axios';
import './App.css';


// Reusable UI components
const Navigation = () => {
  // Navigation component code
  return <div>Navigation Component</div>;
};

const SearchBar = ({ onSearch }) => {
  const [medication, setMedication] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(medication, location);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Medication"
        value={medication}
        onChange={(event) => setMedication(event.target.value)}
      />
      <input
        type="text"
        placeholder="Location"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
};

const ResultsDisplay = ({ pharmacies }) => {
  return (
    <div>
      <h2>Results:</h2>
      {pharmacies.map((pharmacy) => (
        <div key={pharmacy.id}>{pharmacy.name}</div>
      ))}
    </div>
  );
};

const GoogleMaps = ({ pharmacies }) => {
  const containerStyle = {
    width: '400px',
    height: '400px',
  };

  const center = {
    lat: 37.7749,
    lng: -122.4194,
  };

  return (
    <LoadScript googleMapsApiKey="YOUR_API_KEY">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12}>
        {pharmacies.map((pharmacy) => (
          <Marker
            key={pharmacy.id}
            position={{ lat: pharmacy.lat, lng: pharmacy.lng }}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
};

const DetailsPage = () => {
  return <div>Details Page Component</div>;
};

const UserFeedback = () => {
  return <div>User Feedback Component</div>;
};

const App = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        // Fetch pharmacies from the backend API
        const response = await axios.get('/api/pharmacies/');
        const data = await response.data;
        setPharmacies(data);
        setIsLoading(false);
      } catch (error) {
        setError('Error fetching pharmacies');
        setIsLoading(false);
      }
    };

    fetchPharmacies();
  }, []);

  const handleSearch = (medication, location) => {
    // Perform search based on medication and location
    // Update state accordingly
    console.log('Medication:', medication);
    console.log('Location:', location);
  };

  const handlePremiumFeature = () => {
    // Implement logic for premium feature
    setIsPremium(true);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <Navigation />
      <SearchBar onSearch={handleSearch} />
      <ResultsDisplay pharmacies={pharmacies} />
      <GoogleMaps pharmacies={pharmacies} />
      <DetailsPage />
      <UserFeedback />
      {isPremium && (
        <div>
          <button onClick={handlePremiumFeature}>Access Premium Feature</button>
        </div>
      )}
    </div>
  );
};

export default App;