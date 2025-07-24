// Flask Integration

document.getElementById('fmForm').addEventListener('submit', async function(event) {
  event.preventDefault();  // prevent normal form submission
 
  const formData = new FormData(this);

  try {
    const response = await fetch('/', {  // Flask endpoint
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Flask response not ok.');

    const data = await response.json();  // parse JSON response
    window.JSON_CHARACTERIZATION = data.data.JSON_CHARACTERIZATION;
    window.TXT_CHARACTERIZATION = data.data.TXT_CHARACTERIZATION;
    window.FM_NAME = data.data.FM_NAME;
    drawFMFactLabel(window.JSON_CHARACTERIZATION);

  } catch (error) {
    console.error('Error:', error);
  }
});


document.getElementById('jsonForm').addEventListener('submit', async function(event) {
  event.preventDefault();  // prevent normal form submission
 
  const formData = new FormData(this);

  try {
    const response = await fetch('/uploadJSON', {  // Flask endpoint
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Flask response not ok.');

    const data = await response.json();  // parse JSON response
    window.JSON_CHARACTERIZATION = data.data.JSON_CHARACTERIZATION;
    window.TXT_CHARACTERIZATION = data.data.TXT_CHARACTERIZATION;
    window.FM_NAME = data.data.FM_NAME;
    drawFMFactLabel(window.JSON_CHARACTERIZATION);

  } catch (error) {
    console.error('Error:', error);
  }
});
