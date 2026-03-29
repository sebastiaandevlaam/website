import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { ContentfulLivePreviewProvider } from '@contentful/live-preview/react'

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ContentfulLivePreviewProvider
        locale="en-US"
        space="sm8a9cvs0gzu"
        environment="master"
        enableInspectorMode={true}
        enableLiveUpdates={true}
        targetOrigin={['https://app.contentful.com', 'https://app.eu.contentful.com']}
        debugMode={import.meta.env.DEV}
      >
      <App />
    </ContentfulLivePreviewProvider>
  </React.StrictMode>,
)
