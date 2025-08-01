document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("entryForm");
  const fullnameInput = document.getElementById("fullname");
  const departmentSelect = document.getElementById("department");
  const noteInput = document.getElementById("note");
  const photoInput = document.getElementById("photoFile");
  const openCameraBtn = document.getElementById("openCameraBtn");
  const fileNameText = document.getElementById("fileNameText");
  const successSound = document.getElementById("successSound");
  const autocompleteList = document.getElementById("autocompleteList");
  const loadingOverlay = document.getElementById("loadingOverlay"); // ✅ เพิ่มตัวแปร

  let nameList = [];

  // โหลดรายชื่อพนักงาน
  fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ action: "nameList" })
  })
    .then(res => res.json())
    .then(data => nameList = data || [])
    .catch(err => console.warn("❌ โหลดรายชื่อพนักงานล้มเหลว:", err));

  // โหลดหน่วยงาน
  fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ action: "houseList" })
  })
    .then(res => res.json())
    .then(data => {
      data.forEach(dept => {
        const opt = document.createElement("option");
        opt.value = dept;
        opt.textContent = dept;
        departmentSelect.appendChild(opt);
      });
    })
    .catch(err => console.warn("❌ โหลดหน่วยงานล้มเหลว:", err));

  // เปิดกล้อง
  openCameraBtn.addEventListener("click", () => photoInput.click());

  // แสดงชื่อไฟล์ที่เลือกรูป
  photoInput.addEventListener("change", () => {
    fileNameText.textContent = photoInput.files.length > 0
      ? `📷 เลือกแล้ว: ${photoInput.files[0].name}`
      : "";
  });

  // ระบบ autocomplete
  fullnameInput.addEventListener("input", () => {
    const query = fullnameInput.value.trim().toLowerCase();
    autocompleteList.innerHTML = "";
    if (!query) return autocompleteList.classList.add("d-none");

    const matches = nameList.filter(name => name.toLowerCase().includes(query)).slice(0, 8);
    if (matches.length === 0) return autocompleteList.classList.add("d-none");

    matches.forEach(name => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.textContent = name;
      item.addEventListener("click", () => {
        fullnameInput.value = name;
        autocompleteList.classList.add("d-none");
      });
      autocompleteList.appendChild(item);
    });

    autocompleteList.classList.remove("d-none");
  });

  // ซ่อน autocomplete เมื่อคลิกนอก
  document.addEventListener("click", (e) => {
    if (!fullnameInput.contains(e.target) && !autocompleteList.contains(e.target)) {
      autocompleteList.classList.add("d-none");
    }
  });

  // บันทึกข้อมูล
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullname = fullnameInput.value.trim();
    const department = departmentSelect.value.trim();
    const note = noteInput.value.trim();
    const file = photoInput.files[0];

    if (!fullname || !department || !file) {
      return Swal.fire({
        icon: "warning",
        title: "⚠️ ข้อมูลไม่ครบ",
        text: "กรุณากรอกชื่อ หน่วยงาน และแนบรูป"
      });
    }

    loadingOverlay.style.display = "flex"; // ✅ แสดง loading

    try {
      const base64Image = await compressAndWatermark(file);
      const data = new URLSearchParams({
        action: "entry",
        fullname,
        department,
        note,
        filename: file.name,
        file: base64Image
      });

      const response = await fetch(SHEET_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data
      });

      const result = await response.text();
      console.log("📩 ตอบกลับจาก GAS:", result);

      if (!result.startsWith("✅")) throw new Error(result);

      if (successSound) successSound.play();

      await Swal.fire({
        icon: "success",
        title: "✅ บันทึกสำเร็จ",
        text: "ระบบจะประมวลผลในพื้นหลัง",
        timer: 2000,
        showConfirmButton: false
      });

      form.reset();
      fileNameText.textContent = "";

    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "❌ เกิดข้อผิดพลาด",
        text: err.message
      });
    } finally {
      loadingOverlay.style.display = "none"; // ✅ ซ่อน loading ไม่ว่า success หรือ error
    }
  });

  // ฟังก์ชันบีบอัด + ใส่ timestamp
  async function compressAndWatermark(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const maxW = 800;
          const scale = maxW / img.width;
          canvas.width = maxW;
          canvas.height = img.height * scale;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const now = new Date();
          const timestamp = now.toLocaleString("th-TH", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
          });

          ctx.font = `${Math.floor(canvas.width / 22)}px sans-serif`;
          ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 4);
          ctx.fillText(timestamp, 0, 0);
          ctx.restore();

          const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
          resolve(base64);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
});
