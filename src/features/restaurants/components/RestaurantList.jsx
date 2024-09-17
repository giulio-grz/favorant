import React from 'react'
import styles from './App.module.css'

function RestaurantList({ restaurants }) {
  return (
    <ul className={styles.list}>
      {restaurants.map((restaurant) => (
        <li key={restaurant.id} className={styles.listItem}>
          {restaurant.name} - {restaurant.cuisine}
        </li>
      ))}
    </ul>
  )
}

export default RestaurantList