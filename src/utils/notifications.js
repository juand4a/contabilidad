import { run } from "../db/db";
import { buildReminderDate, todayISO, addDaysISO } from "./dates";

function formatNotificationCOP(value = 0) {
  const n = Number(value || 0);

  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

let Notifications = null;

try {
  Notifications = require("expo-notifications");
} catch (e) {
  Notifications = null;
}

if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function initNotifications() {
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  return status === "granted";
}

function normalizeTriggerDate(date) {
  const trigger = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(trigger.getTime())) return null;

  if (trigger.getTime() <= Date.now()) {
    return new Date(Date.now() + 5000);
  }

  return trigger;
}

export async function scheduleReminder(title, body, date, data = {}) {
  return scheduleReminderAt({
    title,
    body,
    date,
    data,
  });
}

export async function scheduleReminderAt({ title, body, date, data = {} }) {
  if (!Notifications) return null;

  const granted = await initNotifications();
  if (!granted) return null;

  const trigger = normalizeTriggerDate(date);
  if (!trigger) return null;

  const payload = {
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger,
  };

  try {
    return await Notifications.scheduleNotificationAsync(payload);
  } catch (e) {
    const dateType = Notifications?.SchedulableTriggerInputTypes?.DATE;

    if (!dateType) throw e;

    return Notifications.scheduleNotificationAsync({
      ...payload,
      trigger: {
        type: dateType,
        date: trigger,
      },
    });
  }
}

export async function cancelReminder(notificationId) {
  if (!Notifications || !notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.log("Cancel notification warn:", e);
  }
}

export async function scheduleRecurringReminder(recurring) {
  const dueDate = recurring.next_date;

  if (!dueDate) return null;

  const reminderDate = buildReminderDate(
    dueDate,
    recurring.reminder_days_before ?? 1,
    9,
    0
  );

  return scheduleReminderAt({
    title: "Membresía por vencer",
    body: `${recurring.name} · ${formatNotificationCOP(
      recurring.amount
    )} · vence ${dueDate}`,
    date: reminderDate,
    data: {
      kind: "recurring",
      recurringId: recurring.id,
      dueDate,
    },
  });
}

export async function scheduleLoanInstallmentReminder(installment) {
  const reminderDate = buildReminderDate(
    installment.due_date,
    installment.reminder_days_before ?? 2,
    9,
    0
  );

  const label =
    installment.direction === "i_owe"
      ? "Cuota por pagar"
      : "Cuota por cobrar";

  return scheduleReminderAt({
    title: label,
    body: `${installment.person} · ${formatNotificationCOP(
      installment.amount
    )} · vence ${installment.due_date}`,
    date: reminderDate,
    data: {
      kind: "loan_installment",
      loanId: installment.loan_id,
      installmentId: installment.id,
    },
  });
}

export async function syncUpcomingNotifications(daysAhead = 45) {
  const today = todayISO();
  const limit = addDaysISO(today, daysAhead);

  const granted = await initNotifications();

  if (!granted) {
    return {
      scheduled: 0,
      available: false,
    };
  }

  let scheduled = 0;

  const recurringR = await run(
    `SELECT * FROM recurring
     WHERE active=1
       AND next_date<=?
       AND (notification_id IS NULL OR notification_id='')`,
    [limit]
  );

  for (const item of recurringR.rows._array || []) {
    const notificationId = await scheduleRecurringReminder(item);

    if (notificationId) {
      await run(`UPDATE recurring SET notification_id=? WHERE id=?`, [
        notificationId,
        item.id,
      ]);

      scheduled += 1;
    }
  }

  const installmentsR = await run(
    `SELECT li.*, l.person, l.direction, l.reminder_days_before
     FROM loan_installments li
     JOIN loans l ON l.id=li.loan_id
     WHERE l.status='open'
       AND li.status!='paid'
       AND li.due_date<=?
       AND (li.notification_id IS NULL OR li.notification_id='')`,
    [limit]
  );

  for (const item of installmentsR.rows._array || []) {
    const notificationId = await scheduleLoanInstallmentReminder(item);

    if (notificationId) {
      await run(`UPDATE loan_installments SET notification_id=? WHERE id=?`, [
        notificationId,
        item.id,
      ]);

      scheduled += 1;
    }
  }

  return {
    scheduled,
    available: true,
  };
}