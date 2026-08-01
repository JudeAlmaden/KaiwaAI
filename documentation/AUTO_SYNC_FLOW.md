# Auto-Sync Flow Diagram

## Login → Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGS IN                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │ Check Current User │
                    │    (auth-helpers)  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Redirect to          │
                    │  /onboarding          │
                    └──────────┬───────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│              ONBOARDING PAGE - AUTO SYNC LOGIC                   │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Check localStorage   │
                    │   hasAnyKey()?       │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
           YES  │                             │  NO
                ▼                             ▼
    ┌───────────────────┐        ┌───────────────────────┐
    │ Redirect to /chat │        │ Show Loading Screen   │
    │   (Keys exist)    │        │  "Checking for keys"  │
    └───────────────────┘        └───────────┬───────────┘
                                              │
                                              ▼
                                ┌──────────────────────────────┐
                                │ API Call:                    │
                                │ GET /api/settings/server-key │
                                │     ?sync=true               │
                                └──────────┬───────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                   YES  │                                     │  NO
                        ▼                                     ▼
        ┌───────────────────────────┐         ┌──────────────────────┐
        │ Server Keys Found!        │         │ No Server Keys       │
        │ (data.keys.length > 0)    │         │ (empty/error)        │
        └──────────┬────────────────┘         └────────┬─────────────┘
                   │                                    │
                   ▼                                    ▼
        ┌───────────────────────┐         ┌─────────────────────────┐
        │ Sync Keys to Local    │         │ Hide Loading Screen     │
        │ addKey() for each     │         │ setIsSyncing(false)     │
        └──────────┬────────────┘         └────────┬────────────────┘
                   │                               │
                   ▼                               ▼
        ┌───────────────────────┐         ┌─────────────────────────┐
        │ Show Success Message  │         │ Show Manual Setup Form  │
        │ "Found X keys..."     │         │ Step 1: Why API Key?    │
        └──────────┬────────────┘         │ Step 2: Enter Key       │
                   │                      └────────┬────────────────┘
                   ▼                               │
        ┌───────────────────────┐                 ▼
        │ Wait 1.5 seconds      │         ┌──────────────────────────┐
        └──────────┬────────────┘         │ User Enters API Key      │
                   │                      │ + Optional Label         │
                   │                      │ + Server Sync Checkbox ✓ │
                   │                      └────────┬─────────────────┘
                   │                               │
                   │                               ▼
                   │              ┌─────────────────────────────────┐
                   │              │ Validate Key with Google API    │
                   │              │ (fetch generativelanguage..)    │
                   │              └────────┬────────────────────────┘
                   │                       │
                   │            ┌──────────┴──────────┐
                   │            │                     │
                   │       VALID│                     │INVALID
                   │            ▼                     ▼
                   │  ┌──────────────────┐   ┌──────────────┐
                   │  │ addKey(local)    │   │ Show Error   │
                   │  └────────┬─────────┘   └──────────────┘
                   │           │
                   │           ▼
                   │  ┌─────────────────────────────┐
                   │  │ If enableServerSync:        │
                   │  │ POST /api/settings/         │
                   │  │      server-key             │
                   │  │ (encrypt & store on server) │
                   │  └────────┬────────────────────┘
                   │           │
                   └───────────┴──────────────┐
                                              │
                                              ▼
                               ┌──────────────────────────┐
                               │ Redirect to /chat        │
                               │ (Ready to use!)          │
                               └──────────────────────────┘
```

## Key Benefits

### For First-Time Users
- ✅ One-time setup with optional server sync
- ✅ Works across all devices if sync enabled
- ✅ Background features available immediately

### For Returning Users (New Device)
- ✅ No manual re-entry needed
- ✅ Automatic sync in < 2 seconds
- ✅ Seamless experience

### For Existing Users (Same Device)
- ✅ No impact - instant redirect
- ✅ No unnecessary loading

## Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY & ENCRYPTION                        │
└─────────────────────────────────────────────────────────────────┘

  CLIENT SIDE                    SERVER SIDE
  (localStorage)                 (Database)
      
  API Key                            
  "AIzaSy..."                    
      │                              
      │ User enables                 
      │ server sync                  
      │                              
      ▼                              
  POST /api/settings/server-key      
      │                              
      │                              ▼
      │                    ┌──────────────────────┐
      │                    │ encryptSecret()      │
      │                    │ AES-256-GCM          │
      │                    │ + ENCRYPTION_KEY     │
      │                    └──────────┬───────────┘
      │                               │
      │                               ▼
      │                    ┌──────────────────────┐
      │                    │ Store in DB:         │
      │                    │ user.geminiKeyEnc    │
      │                    │ "iv.tag.ciphertext"  │
      │                    └──────────┬───────────┘
      │                               │
      │                               │
      │ User on new device            │
      │                               │
      ▼                               ▼
  GET /api/settings/server-key?sync=true
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │ decryptSecret()      │
                           │ AES-256-GCM          │
                           │ + ENCRYPTION_KEY     │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │ Return plain keys    │
                           │ (HTTPS only)         │
                           └──────────┬───────────┘
      ▲                               │
      │                               │
      │◄──────────────────────────────┘
      │
      ▼
  addKey() → localStorage
  "kaiwa_gemini_keys"
```

## Error Handling

- **No server keys**: Falls back to manual setup (no error shown)
- **Network error**: Falls back to manual setup (silent fail)
- **Invalid encrypted key**: Falls back to manual setup (silent fail)
- **Invalid API key (manual entry)**: Shows error, user can retry
- **Validation failed**: Shows specific error (400, 429, etc.)
