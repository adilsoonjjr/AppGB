import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ presentation: 'modal', headerShown: true, title: '' }} />
          <Stack.Screen name="cart" options={{ presentation: 'modal', headerShown: true, title: 'Carrinho' }} />
          <Stack.Screen name="checkout" options={{ headerShown: true, title: 'Finalizar Pedido' }} />
          <Stack.Screen name="order/[id]" options={{ headerShown: true, title: 'Acompanhar Pedido' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
