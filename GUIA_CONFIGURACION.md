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

### Paso 1.3: Crear Colección `players`
1. Dentro de `GameDB`, crea una colección llamada `players`.
2. Copia el **Collection ID** de `players`.

#### Atributos para `players`
| Clave  | Tipo    | Tamaño/Requerido |
|--------|---------|------------------|
| name   | String  | 100 (Required)   |
| x      | Float   | (Required)       |
| y      | Float   | (Required)       |
| size   | Float   | (Required)       |
| color  | String  | 20 (Required)    |
| status | String  | 10 (Required)    |
| lastHeartbeat | Integer | (Optional) |

### Paso 1.4: Crear Colección `food`
1. Dentro de `GameDB`, crea una nueva colección llamada `food`.
2. Copia el **Collection ID** de `food`.

#### Atributos para `food`
| Clave  | Tipo    | Tamaño/Requerido |
|--------|---------|------------------|
| x      | Float   | (Required)       |
| y      | Float   | (Required)       |
| color  | String  | 20 (Required)    |

### Paso 1.5: Crear Colección `messages`
1. Dentro de `GameDB`, crea una nueva colección llamada `messages`.
2. Copia el **Collection ID** de `messages`.

#### Atributos para `messages`
| Clave  | Tipo    | Tamaño/Requerido |
|--------|---------|------------------|
| playerId | String | 50 (Required)   |
| playerName | String | 100 (Required) |
| message | String | 255 (Required)   |
| timestamp | Integer | (Required)      |

### Paso 1.6: Configurar Permisos
**Importante:** Para este tutorial, daremos permisos amplios.
1. Ve a la pestaña **Settings** de TODAS las colecciones (`players`, `food`, `messages`).
2. En **Permissions**, añade un nuevo rol: `Any`.
3. Selecciona los permisos: `Create`, `Read`, `Update`, `Delete`.

## 2. Configuración del Entorno (Variables)

Debes configurar las variables de entorno.

### Paso 2.1: Archivo .env.local
Crea un archivo llamado `.env.local` en la raíz del proyecto y añade:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=TU_PROJECT_ID
NEXT_PUBLIC_APPWRITE_DATABASE_ID=TU_DATABASE_ID
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=TU_PLAYERS_COLLECTION_ID
NEXT_PUBLIC_APPWRITE_FOOD_COLLECTION_ID=TU_FOOD_COLLECTION_ID
NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=TU_MESSAGES_COLLECTION_ID
```

Reemplaza los valores con los que copiaste en el paso 1.

## 3. Ejecutar el Proyecto
   ```bash
   npm install
   npm run dev
   ```

## 4. Cómo Jugar
* **PC:** Mueve el mouse para dirigir tu roca.
* **Móvil:** Usa el joystick virtual.
* **Chat:** Escribe en la caja inferior izquierda y presiona Enter.
* **Objetivo:** Come rocas y comida para crecer y subir en la clasificación.
