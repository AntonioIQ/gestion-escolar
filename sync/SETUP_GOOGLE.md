# Configuracion de Google Forms + Sheets

## Paso 1: Crear el Google Form

Crea un formulario en Google Forms con estos campos (nombres exactos):

| Campo             | Tipo              |
|-------------------|-------------------|
| Matricula         | Respuesta corta   |
| Nombre            | Respuesta corta   |
| Apellido          | Respuesta corta   |
| Fecha Nacimiento  | Fecha             |
| Genero            | Opcion multiple (M/F) |
| Email             | Respuesta corta   |
| Telefono          | Respuesta corta   |
| Direccion         | Respuesta corta   |
| Ciudad            | Respuesta corta   |
| Estado            | Respuesta corta   |
| Codigo Postal     | Respuesta corta   |

En la pestana "Respuestas" del Form, haz clic en el icono de Google Sheets
para que las respuestas se guarden automaticamente en una hoja.

## Paso 2: Habilitar la API de Google Sheets

1. Ve a https://console.cloud.google.com/
2. Arriba a la izquierda, junto a "Google Cloud", haz clic en el selector de proyecto
3. Clic en "Proyecto nuevo", ponle un nombre (ej: "escolar") y clic en "Crear"
4. Asegurate de que el proyecto nuevo esta seleccionado arriba
5. Ve al menu hamburguesa (tres lineas) > "APIs y servicios" > "Biblioteca"
6. Busca "Google Sheets API" y haz clic en el resultado
7. Clic en "Habilitar"

## Paso 3: Crear cuenta de servicio y descargar el JSON

1. Ve al menu hamburguesa > "APIs y servicios" > "Credenciales"
2. Clic en "+ Crear credenciales" (boton azul arriba)
3. Selecciona "Cuenta de servicio"
4. Ponle un nombre (ej: "sync-escolar") y clic en "Crear y continuar"
5. En "Rol" puedes dejarlo vacio, clic en "Continuar" y luego "Listo"
6. Ahora veras la cuenta creada en la lista. Haz clic en el email de la cuenta
   (algo como: sync-escolar@escolar-xxxxx.iam.gserviceaccount.com)
7. Ve a la pestana "Claves" (arriba)
8. Clic en "Agregar clave" > "Crear clave nueva"
9. Selecciona "JSON" y clic en "Crear"
10. Se descarga automaticamente un archivo .json a tu computadora
11. Renombra ese archivo a `credentials.json`
12. Muevelo a la carpeta `sync/` del proyecto:
    ```bash
    mv ~/Descargas/escolar-xxxxx-xxxx.json sync/credentials.json
    ```

## Paso 4: Compartir la hoja con la cuenta de servicio

1. Abre el archivo `sync/credentials.json` con cualquier editor de texto
2. Busca la linea que dice `"client_email":` y copia el email
   (se ve como: sync-escolar@escolar-xxxxx.iam.gserviceaccount.com)
3. Abre la hoja de Google Sheets (la que se creo con las respuestas del Form)
4. Clic en "Compartir" (boton verde arriba a la derecha)
5. Pega el email de la cuenta de servicio
6. Asegurate de que diga "Editor" y clic en "Enviar"

## Paso 4: Configurar el proyecto

1. Copia el ID de la hoja de la URL:
   `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`
2. Agregalo al archivo `.env`:
   ```
   GOOGLE_SHEET_ID=ESTE_ES_EL_ID
   ```

## Paso 5: Instalar dependencias

```bash
pip install gspread google-auth
```

## Paso 6: Ejecutar sincronizacion

```bash
python -m sync.google_sheets
```

Para ejecutar automaticamente cada hora, agrega un cron job:

```bash
crontab -e
```

Agrega esta linea:
```
0 * * * * cd /home/antonio-tapia/Documentos/BD_alumnos && /home/antonio-tapia/anaconda3/bin/python -m sync.google_sheets >> /tmp/sync_escolar.log 2>&1
```
