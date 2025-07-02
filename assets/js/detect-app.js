(function () {
  const ua = navigator.userAgent.toLowerCase();

  // ตรวจว่ามาจากแอปภายนอกที่ไม่รองรับกล้อง
  const blockedSources = ["line", "instagram", "fbav", "facebook", "tiktok"];

  const isBlocked = blockedSources.some(app => ua.includes(app));

  if (isBlocked) {
    document.body.innerHTML = `
      <div style="max-width: 480px; margin: 2rem auto; padding: 1.5rem; text-align: center; font-family: sans-serif;">
        <h3 style="color: #c00;">🚫 ไม่รองรับการใช้งานผ่านแอปนี้</h3>
        <p>กรุณาเปิดลิงก์นี้ผ่าน <strong>Google Chrome</strong> หรือ <strong>Safari</strong> โดยตรง</p>
        <p>ระบบนี้ต้องใช้กล้องในการถ่ายรูปยืนยันตัวตน</p>
      </div>
    `;
  }
})();
