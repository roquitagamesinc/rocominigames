# Guía de Configuración para Rocosos.io

Este documento te guiará paso a paso para configurar el entorno de desarrollo y producción para el juego **Rocosos.io**, utilizando **Next.js**, **Three.js** y **Appwrite**.

## 1. Configuración de Appwrite

Appwrite será nuestro backend para gestionar la base de datos de jugadores en tiempo real.

### Paso 1.1: Crear Proyecto
1. Ve a tu consola de Appwrite (puede ser Appwrite Cloud o una instancia local).
2. Crea un nuevo proyecto llamado `Rocosos`.
3. Copia el **Project ID** y el **API Endpoint**.

### Paso 1.2: Crear Base de Datos
1. En el menú de la izquierda, selecciona **Databases**.
2. Crea una nueva base de datos llamada `GameDB`.
3. Copia el **Database ID**.

### Paso 1.3: Crear Colección
1. Dentro de `GameDB`, crea una colección llamada `players`.
2. Copia el **Collection ID**.

### Paso 1.4: Definir Atributos
Añade los siguientes atributos a la colección `players`:

| Clave  | Tipo    | Tamaño/Requerido |
|--------|---------|------------------|
| name   | String  | 100 (Required)   |
| x      | Float   | (Required)       |
| y      | Float   | (Required)       |
| size   | Float   | (Required)       |
| color  | String  | 20 (Required)    |
| status | String  | 10 (Required)    |

### Paso 1.5: Configurar Permisos
**Importante:** Para este tutorial y facilitar el acceso "serverless" desde el cliente, daremos permisos amplios. En un juego real, deberías usar Appwrite Functions para validar la lógica.

1. Ve a la pestaña **Settings** (Configuración) de la colección `players`.
2. En **Permissions**, añade un nuevo rol: `Any`.
3. Selecciona los permisos: `Create`, `Read`, `Update`, `Delete`.
   * Esto permite que cualquier usuario (incluso no autenticado) pueda leer y escribir posiciones.

## 2. Configuración del Entorno (Variables)

Debes configurar las variables de entorno para que la aplicación sepa a qué proyecto de Appwrite conectarse.

### Paso 2.1: Archivo .env.local
Crea un archivo llamado `.env.local` en la raíz del proyecto (si no existe) y añade lo siguiente:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1  # O tu endpoint local
NEXT_PUBLIC_APPWRITE_PROJECT=TU_PROJECT_ID
NEXT_PUBLIC_APPWRITE_DATABASE_ID=TU_DATABASE_ID
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=TU_COLLECTION_ID
```

Reemplaza los valores con los que copiaste en el paso 1.

### Paso 2.2: Vercel (Producción)
Si despliegas en Vercel:
1. Ve a tu proyecto en el dashboard de Vercel.
2. Ve a **Settings > Environment Variables**.
3. Añade las mismas variables de arriba una por una.

## 3. Ejecutar el Proyecto

1. Instala las dependencias (si no lo has hecho):
   ```bash
   npm install
   ```
2. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abre `http://localhost:3000` en tu navegador.

## 4. Cómo Jugar
* **PC:** Mueve el mouse para dirigir tu roca.
* **Móvil:** Usa el joystick virtual en la esquina inferior izquierda.
* **Objetivo:** Come rocas más pequeñas que tú para crecer. Evita las rocas más grandes.

## Notas Adicionales
* La latencia depende de tu conexión a Appwrite.
* La lógica de "comer" se ejecuta en el cliente. Si dos jugadores tienen lag, puede haber discrepancias visuales.
