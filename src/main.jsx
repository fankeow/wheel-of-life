import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import WheelOfLife from './WheelOfLife.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WheelOfLife />
  </StrictMode>
)
