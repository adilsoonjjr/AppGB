$envVars = @{
  "NEXT_PUBLIC_FIREBASE_API_KEY"            = "AIzaSyATCdND-THD6vF6BDmyUB1ZWn3Rw-I4j6U"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"        = "sasrestaurante.firebaseapp.com"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"         = "sasrestaurante"
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"     = "sasrestaurante.firebasestorage.app"
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"= "334820227521"
  "NEXT_PUBLIC_FIREBASE_APP_ID"             = "1:334820227521:web:e385c5a845fe80e7df5740"
  "NEXT_PUBLIC_RESTAURANT_ID"               = "default"
  "NEXT_PUBLIC_RESTAURANT_NAME"             = "Galpao Baiano"
  "NEXT_PUBLIC_PRIMARY_COLOR"               = "#D97706"
  "NEXT_PUBLIC_WHATSAPP_NUMBER"             = "5571999999999"
  "NEXT_PUBLIC_PIX_NAME"                    = "Galpao Baiano"
  "NEXT_PUBLIC_PIX_CITY"                    = "SALVADOR"
  "NEXT_PUBLIC_APP_URL"                     = "https://sassalao-hm6l.vercel.app"
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"       = "ddyzegbpk"
  "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"    = "galpao_upload"
}

foreach ($key in $envVars.Keys) {
  $value = $envVars[$key]
  Write-Host "Adicionando $key..."
  $value | npx vercel env add $key production --force 2>&1 | Out-Null
  $value | npx vercel env add $key preview --force 2>&1 | Out-Null
}

Write-Host "`n✅ Variáveis adicionadas! Rode: npx vercel --prod"
