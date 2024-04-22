import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {AuthProvider} from "react-oidc-context";
import { oidcConfig } from './oidcConfig';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <AuthProvider {...oidcConfig}>
          <BrowserRouter basename="/SaveUrlToDropbox/">
              <Routes>
                  <Route path="/" element={<App/>} />
              </Routes>
          </BrowserRouter>
      </AuthProvider>
  </React.StrictMode>,
)
