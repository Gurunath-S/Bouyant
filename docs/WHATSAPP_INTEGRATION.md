# Meta WhatsApp Integration & Configuration Guide

This document outlines the architecture, environment setup, template configuration, and testing procedures for the Meta WhatsApp Cloud API integration built into the **Buoyant Media B2B Exhibition Platform**.

---

## 1. Required Environment Variables

All WhatsApp configurations are maintained in `server/.env` (reference: `server/.env.example`).

```env
# Meta WhatsApp Cloud API Configuration (Disabled by default)
WHATSAPP_ENABLED=false
WHATSAPP_API_VERSION="v20.0"
WHATSAPP_PHONE_NUMBER_ID="your_meta_phone_number_id"
WHATSAPP_ACCESS_TOKEN="your_meta_system_user_permanent_access_token"
WHATSAPP_BUSINESS_ACCOUNT_ID="your_meta_waba_id"
WHATSAPP_TEMPLATE_LANGUAGE="en"

# Configurable Meta WhatsApp Approved Template Names
WHATSAPP_TEMPLATE_BOOKING_CREATED="booking_created"
WHATSAPP_TEMPLATE_PAYMENT_SUCCESS="payment_success"
WHATSAPP_TEMPLATE_BOOKING_CONFIRMED="booking_confirmed"
WHATSAPP_TEMPLATE_PAYMENT_FAILED="payment_failed"
WHATSAPP_TEMPLATE_BOOKING_EXPIRED="booking_expired"
WHATSAPP_TEMPLATE_INVOICE_GENERATED="invoice_generated"
WHATSAPP_TEMPLATE_ADMIN_ALERT="admin_alert"
```

> **Note:** When `WHATSAPP_ENABLED=false`, all WhatsApp notifications are safely bypassed without affecting existing database transactions or application workflows.

---

## 2. Architecture & Control Flow

The notification module is isolated from core booking and payment logic.

```
Booking / Payment Action
         │
         ▼
NotificationsService.dispatchEvent(...) [Non-blocking setImmediate]
         │
         ├───> In-App Database Notification (Prisma)
         ├───> Email Notification (EmailService)
         └───> WhatsAppService.send...(...)
                   │
                   ▼
             WhatsAppClient.sendMessage(...) [Fetch -> Meta Cloud API]
```

### Key Guarantees:
- **Asynchronous Execution:** Meta API calls take place out-of-band using non-blocking microtasks (`setImmediate`). A slow or failing WhatsApp API request **never** rolls back or delays database transactions.
- **Idempotency & Safety:** Phone numbers are validated and converted to E.164 international format before dispatch (`server/src/utils/phone.ts`). Missing or invalid numbers fail gracefully.

---

## 3. Supported Events & Templates

| Event | Recipient | Default Template Name | Parameters Sent |
| :--- | :--- | :--- | :--- |
| `BOOKING_CREATED` | Exhibitor (Customer) | `booking_created` | `{{1}}` Name, `{{2}}` Exhibition, `{{3}}` Stalls, `{{4}}` BookingRef, `{{5}}` Amount |
| `PAYMENT_RECEIVED` | Exhibitor (Customer) | `payment_success` | `{{1}}` Name, `{{2}}` BookingRef, `{{3}}` PaidAmount, `{{4}}` Exhibition, `{{5}}` Stalls, `{{6}}` RemainingBalance |
| `BOOKING_CONFIRMED` | Exhibitor (Customer) | `booking_confirmed` | `{{1}}` Name, `{{2}}` Exhibition, `{{3}}` Stalls, `{{4}}` BookingRef |
| `PAYMENT_FAILED` | Exhibitor (Customer) | `payment_failed` | `{{1}}` Name, `{{2}}` BookingRef, `{{3}}` Exhibition |
| `BOOKING_EXPIRED` | Exhibitor (Customer) | `booking_expired` | `{{1}}` Name, `{{2}}` BookingRef, `{{3}}` Exhibition |
| `INVOICE_GENERATED` | Exhibitor (Customer) | `invoice_generated` | `{{1}}` Name, `{{2}}` InvoiceNumber, `{{3}}` BookingRef, `{{4}}` Exhibition |
| `ADMIN_ALERT` | Admins & Staff | `admin_alert` | `{{1}}` AlertType, `{{2}}` Exhibition, `{{3}}` Company, `{{4}}` Contact, `{{5}}` Details |

---

## 4. How to Enable WhatsApp Notifications

Once the Meta WhatsApp team provides the approved credentials and templates:

1. Log in to the [Meta Business Suite / Developer Portal](https://developers.facebook.com/).
2. Obtain the **Phone Number ID**, **Permanent Access Token**, and **WABA ID**.
3. Set the variables in `server/.env`:
   ```env
   WHATSAPP_ENABLED=true
   WHATSAPP_PHONE_NUMBER_ID="1234567890"
   WHATSAPP_ACCESS_TOKEN="EAAG..."
   WHATSAPP_BUSINESS_ACCOUNT_ID="9876543210"
   ```
4. If Meta approved custom template names (e.g. `buoyant_stall_booked`), update the corresponding `WHATSAPP_TEMPLATE_*` variables in `.env`.
5. Restart the server.

---

## 5. Information Required from Meta / WhatsApp Team

The Meta setup team needs to provide/confirm:

1. **Meta App & WABA Account Credentials:** `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`.
2. **Approved Template Names:** Exact template slug names approved in Meta WhatsApp Manager.
3. **Template Parameter Formats:** Confirmation that template parameters match the variable count (`{{1}}`, `{{2}}`, etc.).
