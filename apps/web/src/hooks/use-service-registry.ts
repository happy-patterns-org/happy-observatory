import { useEffect, useState } from 'react'
import { ServiceEndpoint, ServiceRegistry } from '@/lib/services/registry'

let registry: ServiceRegistry | null = null

export function useServiceRegistry() {
  const [services, setServices] = useState<ServiceEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    // Initialize registry singleton
    if (!registry) {
      registry = new ServiceRegistry()
    }
    
    const loadServices = async () => {
      try {
        setLoading(true)
        await registry!.discover()
        setServices(registry!.getAllServices())
        setError(null)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    
    // Initial load
    loadServices()
    
    // Set up auto-refresh
    registry.startAutoRefresh(30000) // Check every 30 seconds
    
    // Set up listener for service updates
    const interval = setInterval(() => {
      setServices(registry!.getAllServices())
    }, 1000) // Update UI every second
    
    return () => {
      clearInterval(interval)
    }
  }, [])
  
  return {
    services,
    loading,
    error,
    isServiceOnline: (name: string) => registry?.isServiceOnline(name) || false,
    getService: (name: string) => registry?.getService(name),
    onlineServices: services.filter(s => s.status === 'online'),
    offlineServices: services.filter(s => s.status === 'offline'),
    refresh: async () => {
      if (registry) {
        await registry.discover()
        setServices(registry.getAllServices())
      }
    }
  }
}