import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Sends receipt data to the RawBT Android app via intent URL for thermal printing.
 * Uses RawBT's built-in pseudo-HTML tags for advanced formatting.
 */
export function printToRawBT(receiptData, storeSettings, isReprint = false) {
  let text = "";
  
  // Header with Logo
  text += "<center>";
  // Logo uses the current deployment origin.
  text += `<image>${window.location.origin}/logo.png</image>\n`;
  text += `<b>${storeSettings.storeName.toUpperCase()}</b>\n`;
  text += `${storeSettings.storeAddress}\n`;
  text += `Telp: ${storeSettings.storePhone}\n`;
  text += "</center>\n";
  
  text += "--------------------------------\n";
  
  // Transaction Info
  text += `${receiptData.date}\n`;
  text += `<b>ID    :</b> ${receiptData.receiptId}\n`;
  text += `<b>Kasir :</b> ${receiptData.cashier}\n`;
  text += `<b>Metode:</b> ${receiptData.paymentMethod}\n`;
  
  text += "--------------------------------\n";

  // Items
  receiptData.items.forEach(item => {
    text += `<b>${item.name}</b>\n`;
    
    const qtyPrice = `${item.quantity}x ${item.price.toLocaleString('id-ID')}`;
    const subtotal = (item.quantity * item.price).toLocaleString('id-ID');
    
    // Asumsi lebar kertas 32 karakter
    const LINE_WIDTH = 32;
    let spaces = LINE_WIDTH - qtyPrice.length - subtotal.length;
    if (spaces < 1) spaces = 1;
    
    text += `${qtyPrice}${" ".repeat(spaces)}<b>${subtotal}</b>\n`;
  });
  
  text += "--------------------------------\n";
  
  // Total
  const totalLabel = "TOTAL";
  const totalValue = "Rp " + receiptData.total.toLocaleString('id-ID');
  const totalSpaces = 32 - totalLabel.length - totalValue.length;
  text += `<b>${totalLabel}${" ".repeat(Math.max(1, totalSpaces))}${totalValue}</b>\n`;
  
  text += "--------------------------------\n";

  // Footer
  text += "<center>";
  if (isReprint) {
    text += "<b>*** STRUK DICETAK ULANG ***</b>\n";
  }
  text += "Terima kasih atas kunjungan Anda!\n";
  text += "Barang yang sudah dibeli tidak\n";
  text += "dapat ditukar atau dikembalikan.\n";
  text += "</center>\n";
  
  // Spasi kosong agar kertas keluar sempurna
  text += "\n\n";

  // RawBT Intent URL
  const rawbtUrl = `intent:${encodeURI(text)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;action=ru.a402d.rawbtprinter.action.PRINT_TEXT;end;`;
  
  window.location.href = rawbtUrl;
}
