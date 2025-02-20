import sys
from pathlib import Path

# Añadir el directorio app al path de Python
root_dir = Path(__file__).parent.parent
sys.path.append(str(root_dir / 'app'))

from backend.app.services.data_service import DataService
import json

def main():
    try:
        # Inicializar el servicio
        ds = DataService()
        
        # Obtener estadísticas básicas
        print("\n=== Estadísticas Básicas del Dataset ===")
        stats = ds.get_basic_stats()
        print(json.dumps(stats, indent=2, ensure_ascii=False))
        
        # Obtener algunas estaciones como ejemplo
        print("\n=== Primeras 5 Estaciones con Afluencia Promedio ===")
        stations = ds.get_stations()[:5]
        print(json.dumps(stations, indent=2, ensure_ascii=False))
        
        # Probar búsqueda de estación con diferentes formatos
        test_stations = ['Pino Suarez', 'Pino Suárez', 'PINO SUAREZ']
        print("\n=== Prueba de búsqueda con diferentes formatos ===")
        for station in test_stations:
            result = ds.find_station(station)
            print(f"\nBuscando: {station}")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
        # Probar estadísticas por línea
        print("\n=== Estadísticas por Línea ===")
        line_stats = ds.get_line_stats("Linea 1")  # Probamos con diferentes formatos
        print("\nEstadísticas Línea 1:")
        print(json.dumps(line_stats, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error durante la prueba: {e}")

if __name__ == "__main__":
    main()