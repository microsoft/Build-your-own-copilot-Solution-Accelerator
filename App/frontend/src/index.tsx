// import react
import React, { ReactElement } from 'react'

import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { initializeIcons } from '@fluentui/react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import Layout from './pages/layout/Layout'
import { AppStateProvider } from './state/AppProvider'
import './index.css'

initializeIcons()

export default function App (): ReactElement {
  return (
        <AppStateProvider>
            <HashRouter>
                <Routes>
                    <Route index element={<Layout />} />
                </Routes>
            </HashRouter>
        </AppStateProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <FluentProvider theme={webLightTheme}>
        <App />
    </FluentProvider>
)
