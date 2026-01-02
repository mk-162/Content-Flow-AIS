# Terraform

# Currently [15.12.2025]
Terraform handles the core setup of the domains:
- create a CloudFlare pages project
- links project to the git mono repo [astromssn](https://github.com/electricazimuth/astromssn)
- sets up DNS domain for ${project}.mssnhst.com

# Required details
To setup it requires these configs which tell it where to grab the content for the site from firebase (org & project). 
And sets a theme (must be setup in the mono repo as a theme beforehand)
- org_id       = "org_1234567890_a123b45de"
- proj_id      = "proj_1234567890_b1cb4abc"
- theme        = "default" 
and a few project ids 
- project_name = "mssn-ribble"
- custom_domain = "ribble.mssnhst.com"
- dns_zone     = "mssnhst.com"
- dns_record   = "ribble"

--- 

# Todo

Ultimately the terraform config file can be automated from setting up clients across the whole system, create firebase credentials, project, org can all be extracted and populate the terraform config.


## Auto generate Header / Footer / Homepage
Currently there is a theme folder that contains various themes
```bash
├── default
│   ├── components
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   └── Welcome.astro
│   ├── rocket_logo.png
│   └── styles
│       └── global.css
├── ribble
│   ├── components
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   └── Welcome.astro
│   └── styles
│       └── global.css
└── thisworks
    ├── components
    │   ├── Footer.astro
    │   ├── Header.astro
    │   └── Welcome.astro
    └── styles
        └── global.css
```

## Deployment Hooks
To trigger a re-build / refresh of the site you send a POST call to an encoded web hook endpoint. This will need to be setup in the CMS side.
Currently generating these is done manually via the admin interface. 

### Store the Hook in your Database
In the Firebase Database (Firestore) save this URL inside the tenant's project settings so the app knows which URL to hit.
Examples
```url
https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/12b34567-a12b-4321-a11a-11aa7bbbb789
```
Test on the command line, curl example
```bash
curl -d "" "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/12b34567-a12b-4321-a11a-11aa7bbbb789"
```
