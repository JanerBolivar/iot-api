export default {
    User: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      }
    },
    DeviceInput: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Mi Sensor' }
      }
    },
    Device: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        status: { type: 'boolean' },
        ownerId: { type: 'string', format: 'uuid' }
      }
    }
  };