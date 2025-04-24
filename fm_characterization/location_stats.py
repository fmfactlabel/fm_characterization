import pathlib
import json
import requests


class LocationStats:

    def __init__(self, location_stats_file: str) -> None:
        self._location_stats_file = location_stats_file
        if pathlib.Path(location_stats_file).exists():
            with open(location_stats_file, encoding='UTF8') as file:
                self._data = json.load(file)
        else:
            self._data: dict[str, dict[str, dict[str, int]]] = {}  # Continent -> Country -> City -> Count

    def add_location(self, continent: str, country: str, city: str) -> None:
        if continent not in self._data:
            self._data[continent] = {}
        if country not in self._data[continent]:
            self._data[continent][country] = {}
        if city not in self._data[continent][country]:
            self._data[continent][country][city] = 0
        self._data[continent][country][city] += 1
        with open(self._location_stats_file, 'w', encoding='UTF8') as file:
            json.dump(self._data, file)

    def get_total_visits(self) -> int:
        return sum([sum([sum(cities.values()) for cities in countries.values()]) for countries in self._data.values()])
    
    def get_cities_stats(self, country: str = None) -> dict[str, int]:
        cities = {}
        if country is None:
            for continent, continent_data in self._data.items():
                for country, cities_data in continent_data.items():
                    for city, count in cities_data.items():
                        cities[city] = count
        else:
            for cities_data in self._data.get(country, {}).values():
                for city, count in cities_data.items():
                    cities[city] = count
        return cities
    
    def get_countries_stats(self, continent: str = None) -> dict[str, int]:
        countries = {}
        if continent is None:
            for continent, continent_data in self._data.items():
                for country, cities in continent_data.items():
                    countries[country] = sum(cities.values())
        else:
            for country, cities in self._data.get(continent, {}).items():
                countries[country] = sum(cities.values())
        return countries

    def get_continents_stats(self) -> dict[str, int]:
        continents = {}
        for continent, countries in self._data.items():
            continents[continent] = sum([sum(cities.values()) for cities in countries.values()])
        return continents

    @staticmethod
    def get_location_from_ip(ip: str) -> dict[str, str]:
        """Return the continent, country, region and city of the IP address."""
        try:
            response = requests.get(f'https://ipapi.co/{ip}/json/')  # Call the external API
            data = response.json()
            return {key: data.get(key, 'Unknown') for key in ['continent_code', 'country_name', 'city']}
        except Exception as e:
            return {'continent_code': 'Unknown', 'country_name': 'Unknown', 'city': 'Unknown'}
