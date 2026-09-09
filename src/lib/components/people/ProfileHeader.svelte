<script>
  import { Button } from "$lib/components/ui";
  import { personAddress } from "$lib/utils/peopleView.js";
  import CopyButton from "$lib/components/ui/CopyButton.svelte";

  let { person, onUpdateStatus, onUpdateActivity, onEdit, updatingStatus, statusUpdateError } = $props();
  let address = $derived(personAddress(person));
  let status = $derived(person.member_status === "visitor" ? "guest" : person.member_status || "");
</script>

<div class="profile-toolbar">
  <a href="/people">← People directory</a>
  <Button onclick={onEdit}>Edit profile</Button>
</div>
<section class="profile-header" aria-label="Contact details">
  <div class="identity">
    <div class="avatar" aria-hidden="true">{person.first_name?.[0] || ""}{person.last_name?.[0] || ""}</div>
    <div class="identity-text">
      <p class="eyebrow">Person profile</p>
      <h1>{person.first_name} {person.last_name}</h1>
      {#if person.preferred_name}<p class="preferred">Known as {person.preferred_name}</p>{/if}
      {#if person.role && person.role !== "no_role"}<p class="role">{person.role.replaceAll("_", " ")}</p>{/if}
    </div>
  </div>
  <div class="contact-grid">
    <div><span class="label">Phone</span><div class="contact-value">{#if person.phone}<a href="tel:{person.phone}">{person.phone}</a><CopyButton format="text" data={person.phone} label="Copy phone" />{:else}<span class="missing">No phone recorded</span>{/if}</div></div>
    <div><span class="label">Email</span><div class="contact-value">{#if person.email}<a href="mailto:{person.email}">{person.email}</a><CopyButton format="text" data={person.email} label="Copy email" />{:else}<span class="missing">No email recorded</span>{/if}</div></div>
    <div class="address"><span class="label">Address</span><div class="contact-value"><span class:missing={!address}>{address || "No address recorded"}</span>{#if address}<CopyButton format="text" data={address} label="Copy address" />{/if}</div></div>
  </div>
  <div class="status-row">
    <label>Status
      <select aria-label="Member status" value={status} disabled={updatingStatus} onchange={(e) => onUpdateStatus(e.currentTarget.value)}>
        <option value="" disabled>Not recorded</option>
        <option value="guest">Guest</option><option value="member">Member</option><option value="leader">Leader</option><option value="archived">Archived</option>
      </select>
    </label>
    <label>Activity
      <select aria-label="Activity status" value={person.activity_status || ""} disabled={updatingStatus} onchange={(e) => onUpdateActivity(e.currentTarget.value)}>
        <option value="" disabled>Not recorded</option><option value="regular">Regular</option><option value="irregular">Irregular</option><option value="dormant">Dormant</option>
      </select>
    </label>
    <span class="status-hint">{updatingStatus ? "Saving…" : "Activity is manually recorded."}</span>
  </div>
  {#if person.contact_category === "do_not_contact"}<p class="contact-warning">Do not contact — recorded contact preference.</p>{/if}
  {#if statusUpdateError}<p class="error" role="alert">{statusUpdateError}</p>{/if}
</section>

<style>
  .profile-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; } .profile-toolbar a { color: hsl(var(--muted-foreground)); font-size: 14px; } a:hover { text-decoration: underline; }
  .profile-header { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 16px; padding: 24px; }
  .identity { display: flex; align-items: center; gap: 20px; } .identity-text { min-width: 0; } .avatar { flex-shrink: 0; width: 64px; height: 64px; display: grid; place-items: center; background: hsl(var(--primary) / .12); color: hsl(var(--primary)); border-radius: 16px; font-size: 24px; font-weight: 600; }
  .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: hsl(var(--muted-foreground)); margin-bottom: 4px; } h1 { font-size: clamp(24px, 3vw, 32px); line-height: 1.2; font-weight: 600; letter-spacing: -.03em; overflow-wrap: anywhere; } .role, .preferred { color: hsl(var(--muted-foreground)); font-size: 13px; margin-top: 6px; } .role { text-transform: capitalize; }
  .contact-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px 24px; margin-top: 24px; } .address { grid-column: 1 / -1; } .label { display: block; font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 4px; } .contact-value { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; overflow-wrap: anywhere; } .contact-value a { color: hsl(var(--primary)); min-width: 0; } .missing { color: hsl(var(--muted-foreground)); }
  .status-row { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; border-top: 1px solid hsl(var(--border)); margin-top: 24px; padding-top: 20px; } .status-row label { display: flex; gap: 8px; align-items: center; font-size: 12px; color: hsl(var(--muted-foreground)); } select { border: 1px solid hsl(var(--border)); border-radius: 8px; padding: 8px 10px; background: hsl(var(--background)); color: hsl(var(--foreground)); font-size: 13px; } .status-hint { color: hsl(var(--muted-foreground)); font-size: 12px; } .error, .contact-warning { margin-top: 16px; color: hsl(var(--warning)); font-size: 13px; }
  @media(min-width: 1050px) { .profile-header { display: grid; grid-template-columns: .9fr 1.1fr; gap: 0 24px; } .identity { align-self: start; padding-top: 8px; } .contact-grid { margin-top: 0; gap: 16px; } .contact-grid > div { grid-column: 1 / -1; } .status-row, .error, .contact-warning { grid-column: 1 / -1; } }
  @media(max-width: 600px) { .profile-header { padding: 20px; } .contact-grid { grid-template-columns: 1fr; } .identity { gap: 12px; } .avatar { width: 48px; height: 48px; font-size: 20px; } }
</style>
