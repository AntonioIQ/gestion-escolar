import json
from datetime import datetime
from pathlib import Path

class GestorAlumnos:
    def __init__(self, archivo='alumnos.json'):
        self.archivo = Path(archivo)
        self.alumnos = self._cargar()
    
    def _cargar(self):
        if self.archivo.exists():
            with open(self.archivo, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def _guardar(self):
        with open(self.archivo, 'w', encoding='utf-8') as f:
            json.dump(self.alumnos, f, indent=2, ensure_ascii=False)
    
    def agregar_alumno(self, matricula, nombre, carrera):
        self.alumnos[matricula] = {
            'nombre': nombre,
            'carrera': carrera,
            'historial': []
        }
        self._guardar()
        print(f"Alumno {nombre} agregado con matrícula {matricula}")
    
    def agregar_calificacion(self, matricula, materia, calificacion, periodo):
        if matricula not in self.alumnos:
            print(f"Matrícula {matricula} no encontrada")
            return
        
        self.alumnos[matricula]['historial'].append({
            'materia': materia,
            'calificacion': calificacion,
            'periodo': periodo,
            'fecha': datetime.now().strftime('%Y-%m-%d')
        })
        self._guardar()
        print(f"Calificación agregada para {self.alumnos[matricula]['nombre']}")
    
    def ver_historial(self, matricula):
        if matricula not in self.alumnos:
            print(f"Matrícula {matricula} no encontrada")
            return
        
        alumno = self.alumnos[matricula]
        print(f"\n=== {alumno['nombre']} ({matricula}) ===")
        print(f"Carrera: {alumno['carrera']}")
        print("\nHistorial Académico:")
        
        if not alumno['historial']:
            print("  Sin registros")
            return
        
        for registro in alumno['historial']:
            print(f"  {registro['periodo']} - {registro['materia']}: {registro['calificacion']}")
    
    def listar_alumnos(self):
        if not self.alumnos:
            print("No hay alumnos registrados")
            return
        
        print("\n=== Lista de Alumnos ===")
        for matricula, datos in self.alumnos.items():
            print(f"{matricula} - {datos['nombre']} ({datos['carrera']})")

# Ejemplo de uso
if __name__ == '__main__':
    gestor = GestorAlumnos()
    
    # Agregar alumnos
    gestor.agregar_alumno('2024001', 'Juan Pérez', 'Ingeniería en Sistemas')
    gestor.agregar_alumno('2024002', 'María García', 'Arquitectura de Datos')
    
    # Agregar calificaciones
    gestor.agregar_calificacion('2024001', 'Bases de Datos', 9.5, '2024-1')
    gestor.agregar_calificacion('2024001', 'Programación', 8.7, '2024-1')
    gestor.agregar_calificacion('2024002', 'Data Warehousing', 9.8, '2024-1')
    
    # Ver información
    gestor.listar_alumnos()
    gestor.ver_historial('2024001')
