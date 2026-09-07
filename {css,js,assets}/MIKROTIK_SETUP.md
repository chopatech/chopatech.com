# MikroTik Router Setup Guide — CHOPA TECH

This guide configures a MikroTik router so CHOPA TECH can manage it: the RouterOS API,
a hotspot server, user profiles, and the firewall/NAT/DNS rules a captive portal needs.
Steps are shown as Winbox/terminal commands; adjust interface names for your hardware.

## 0. Requirements
- RouterOS 6.43+ (7.x recommended)
- Admin access to the router (Winbox, WebFig, or SSH)
- A dedicated API user (do not reuse your main admin account)

## 1. Enable the RouterOS API

```
/ip service
set api port=8728 disabled=no
# Recommended: enable API-SSL instead of plain API where your RouterOS version supports it
set api-ssl port=8729 disabled=no certificate=your-cert
```

Restrict API access to your CHOPA TECH backend's IP if possible:

```
/ip service set api address=<your-backend-ip>/32
```

## 2. Create a dedicated API user

```
/user group add name=chopa-api policy=api,read,write,test
/user add name=chopa-api password=<strong-password> group=chopa-api
```

Enter this username/password when adding the router in CHOPA TECH — it is encrypted at rest
(AES-256-GCM) and never sent to the browser.

## 3. Create the hotspot

Run the hotspot setup wizard on the interface facing your Wi-Fi/LAN clients (replace `bridge1`
with your actual bridge/interface):

```
/ip hotspot setup
  hotspot interface: bridge1
  local address of network: 10.5.50.1/24
  address pool of network: 10.5.50.10-10.5.50.254
  select certificate: none (or your cert, for HTTPS login)
  ip address of smtp server: 0.0.0.0
  dns servers: 8.8.8.8, 1.1.1.1
  dns name: wifi.chopatech.local
```

## 4. Create hotspot user profiles (one per CHOPA TECH plan)

```
/ip hotspot user profile
add name="1 Hour" rate-limit=5M/2M session-timeout=1h shared-users=1
add name="24 Hours" rate-limit=8M/3M session-timeout=1d shared-users=2
add name="7 Days" rate-limit=10M/4M session-timeout=7d shared-users=2
```

When you create a matching Plan in CHOPA TECH, name it identically (or map it in Settings) so
generated vouchers are created with the correct profile.

## 5. Upload the CHOPA TECH captive portal

CHOPA TECH's Portal Designer exports a set of hotspot login files (`login.html` + assets).
Upload them via Winbox → Files, into `/hotspot/`, or automatically once you configure the
router in the app (Portal Designer → Save → Deploy to router).

## 6. Firewall & NAT

The hotspot wizard creates most of what you need. Confirm these exist:

```
/ip firewall nat
add chain=srcnat out-interface=<wan-interface> action=masquerade

/ip firewall filter
add chain=input protocol=tcp dst-port=8728,8729 action=accept comment="CHOPA TECH API"
add chain=input protocol=tcp dst-port=8728,8729 action=drop comment="Block API from elsewhere"
```

Adjust source-address restrictions to only allow your backend's IP to reach 8728/8729.

## 7. DNS

Point clients' DNS to the router (already set in the hotspot wizard) or to public resolvers
(8.8.8.8, 1.1.1.1) — the hotspot will intercept unauthenticated HTTP(S) requests and redirect
to the captive portal regardless of DNS target, via the hotspot's walled-garden behavior.

## 8. RADIUS (optional, future phase)

CHOPA TECH ships database tables (`radcheck`, `radreply`, `radacct`) and a service interface
for FreeRADIUS, but it is **not required** for the default hotspot-user-based flow. To use
RADIUS instead of local hotspot users later:

```
/radius add service=hotspot address=<freeradius-ip> secret=<shared-secret>
/ip hotspot profile set [find] use-radius=yes
```

## 9. Testing the connection from CHOPA TECH

In **Router Manager → Add router**, enter the host/IP, API port, and the `chopa-api` credentials
created above, then click **Test & save router**. CHOPA TECH will:
1. Open a RouterOS API connection
2. Read `/system/identity` and `/system/resource` (to confirm RouterOS version)
3. Mark the router **ONLINE** on success, or **ERROR** with troubleshooting tips on failure

## 10. Common connection failures

| Symptom | Fix |
|---|---|
| Connection timeout | Router unreachable — check IP, VPN/NAT routing, or that the router is powered on |
| Connection refused | API service disabled — re-check step 1 |
| Invalid credentials | Re-check the `chopa-api` username/password, or that the account isn't disabled |
| Connects but times out on hotspot calls | The hotspot server hasn't been created yet — repeat step 3 |
| Vouchers generate but users can't log in | Hotspot user profile name doesn't match the Plan name — check step 4 |
