i want yout o redegin the sdk-cnonfing page with mdoern ui and modern style 
  and maek sure frontend folow this validation whcih are implment in backend Backend
  SDK-Config Validation
  
  There are two validation layers.
  
  1. Update Request Validation Used when frontend updates remote config:
  
  PATCH /organizations/:orgId/sdk-configs/:configId PATCH
  /organizations/:orgId/projects/:projectId/sdk-configs/:configId
  
  Defined in [sdk-config.types.ts (line
  21)](C:/Users/vikas/OneDrive/Desktop/SaasBackend/pulse/src/modules/organization/sd
  k-config/sdk-config.types.ts:21).
  
  Accepted request shapes:
  
  { "editableConfig": {}, "changeSummary": "optional" }
  
  { "schemaVersion": 1, "configValue": {}, "changeSummary": "optional" }
  
  If configValue is sent, backend extracts editable fields only.
  
  Protected fields are stripped/rejected:
  
  schemaVersion sdk meta entitlements transport.routes.*.url
  
  Editable fields are allowlisted in [editable-allowlist.ts (line
  85)](C:/Users/vikas/OneDrive/Desktop/SaasBackend/pulse/src/modules/projects/sdk-co
  nfig/editable-allowlist.ts:85).
  
  Editable groups:
  
  features.* killswitches.* runtime.configTtlSeconds runtime.staleWhileRevalidate   
  instrumentation.* sampling.<signal> sampling.routes.<path>.<signal>
  privacy.capture.* privacy.scrubbing.enabled privacy.scrubbing.headers
  privacy.scrubbing.fields privacy.piiDetection.* limits.* limits.tenantGovernance.*
  transport.keepAlive transport.retry.* transport.queue.* transport.connections.*   
  transport.routes.<route>.batchSize transport.routes.<route>.flushIntervalMs       
  transport.routes.<route>.timeoutMs transport.routes.<route>.compression
  transport.routes.<route>.priority
  
  2. Editable Value Validation Defined in [validator.ts (line
  256)](C:/Users/vikas/OneDrive/Desktop/SaasBackend/pulse/src/modules/projects/sdk-c
  onfig/validator.ts:256).
  
  Rules include:
  
  features / killswitches / instrumentation: boolean sampling rates: number from 0  
  to 1 runtime.configTtlSeconds: integer 30 to 86400 privacy scrubbing arrays:      
  string[], max 500 entries, max 512 bytes each limits.maxMemoryMb: "auto" or       
  integer 16 to 1024 transport compression: "gzip" or "none" transport priority:    
  "critical" | "high" | "normal" | "low" retry backoff: "exponential" | "linear" |  
  "fixed" queue overflow: "drop_oldest" | "drop_newest" | "reject"
  
  Numeric bounds:
  
  maxSpansPerTrace: 1..5000 maxSpanAttributes: 1..500 maxAttributeLength: 1..16384  
  maxPayloadSize: 1024..4194304 maxQueueSize: 1..100000 retry.maxRetries: 0..10     
  retry.baseDelayMs: 100..30000 queue.maxSize: 1..100000 queue.criticalReserve:     
  0..100000 connections.maxTotalConnections: 1..500 connections.acquireTimeoutMs:   
  100..60000 route.batchSize: 1..5000 route.flushIntervalMs: 0..300000
  route.timeoutMs: 250..60000
  
  3. Full Compiled Config Validation After editable values are accepted, backend    
  recompiles a complete schema-v1 config and validates the full document in
  [validator.ts (line
  319)](C:/Users/vikas/OneDrive/Desktop/SaasBackend/pulse/src/modules/projects/sdk-c
  onfig/validator.ts:319).
  
  It requires exact top-level keys:
  
  schemaVersion sdk features sampling instrumentation privacy limits killswitches   
  transport runtime meta entitlements
  
  Unknown fields fail validation.
  
  Important full-config checks:
  
  schemaVersion must be 1 sdk.projectId required sdk.environment required
  sdk.release required all feature keys must exist and be boolean all sampling      
  signals must exist and be 0..1 transport routes must exactly match backend route  
  keys route URLs must be valid HTTP(S) and end with the expected ingestion path    
  meta.generatedAt must be ISO date-time meta.generatedBy must equal
  pulse-config-compiler@1 meta.configHash must be valid SHA-256 and match computed  
  config hash entitlements must exactly match entitlement keys and be boolean       
  
  Cross-field checks:
  
  limits.tenantGovernance.criticalReserve <= quotaPerWindow
  transport.queue.criticalReserve <= maxSize limits.maxQueueSize <=
  transport.queue.maxSize
  
  Publish Flow
  
  PATCH request -> UpdateSdkConfigSchema -> extract editable config if
  configValue/full document -> applyEditableMutation() -> validate editable leaves  
  -> compile full schema-v1 config -> validateSchemaV1() -> append new immutable    
  revision -> update published head/current revision
  
  So frontend can send full config, but backend only trusts editable intent. The    
  final config always comes from the backend compiler.
  
  this is the abckend verification in remote sdk new ui dont show raw tab we dont   
  our user to see what sdk config we have in backend
  
  
  
  i want you to redesign the whole remote confing ui  redesign the remote config ui 
  inot and modern ui and also ameks ure frotnend followthe validation and we need an
  totally new desgin for our ui which should be modern and better ui ux so that     
  users love that