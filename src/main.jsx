import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { ContentfulLivePreviewProvider } from '@contentful/live-preview/react'
import { SPACE_ID, ENVIRONMENT, CONTENTFUL_APP_ORIGINS } from '@/utils/contentfulConfig'

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ContentfulLivePreviewProvider
        locale="en-US"
        space={SPACE_ID}
        environment={ENVIRONMENT}
        enableInspectorMode={true}
        enableLiveUpdates={true}
        targetOrigin={CONTENTFUL_APP_ORIGINS}
        debugMode={import.meta.env.DEV}
      >
      <App />
    </ContentfulLivePreviewProvider>
  </React.StrictMode>,
)
