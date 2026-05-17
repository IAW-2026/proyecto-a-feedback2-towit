## APIs

Debemos exponer los siguientes endpoints:

**Endpoint:**  
- GET /api/rating/{user_id} 

**Request params:**  
- user_id: string

**Request body:**
```json
{}
```

**Response:**  
```json
{
  "avg_rating": "number" 
}
```


**Endpoint:**  
- GET /api/feedback/{trip_id}/{user_id} 

**Request params:**  
- trip_id: string
- user_id: string

**Request body:**
```json
{}
```

**Response:**  
```json
{
  "rating": "number" 
}
```

## Modelo de datos de la aplicación

#### **Calificacion**
- `id: string`
- `trip_ip: string`
- `rater_clerk_id: string`
- `rated_clerk_id: string`
- `rating: number`
- `tags: string`
- `comment: string`
- `type: string`
- `created_at: string`


#### **Reporte**
- `id_report: string`
- `reporter_clerk_id: string`
- `reported_clerk_id: string`
- `service_id: string`
- `reason: string`
- `description: string`
- `status: string`
- `created_at: string`


#### **UserRating**
- `clerk_id: string`
- `avg_rating: number`
- `total_ratings: number`
- `updated_at: string`

#### **Admin**
- `Admin_id: string`
- `clerk_id: string`
- `full_name: string`

## Sitios web

Debemos proveer los siguientes sitios web

`/history` Muestra el historial de viajes del usuario, junto con la calificación que le dio a cada uno.
`/rate/{trip_id}` Permite al usuario calificar al otro usuario con el que compartió el viaje.
`/profile/{clerk_id}` Muestra el perfil del usuario con dado id.
`/report/{trip_id}` Permite al usuario reportar al otro usuario con el que compartió el viaje dado por el id.
`/` Página de login de la aplicación