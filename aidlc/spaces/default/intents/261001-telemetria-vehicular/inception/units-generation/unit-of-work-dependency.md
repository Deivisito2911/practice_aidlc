# Unit of Work Dependency

El sistema consiste en una sola unidad independiente sin dependencias hacia otras unidades.

```yaml
units:
  - name: telemetry-backend
    kind: service
    depends_on: []
```

## Parallel Development
Solo hay una unidad, por lo que todo se desarrolla en un único hilo.

## Skeleton Slice
Esta unidad representa el skeleton completo desde la ingestión hasta la alerta.
