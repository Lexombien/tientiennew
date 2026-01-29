
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssPath = path.join(__dirname, 'index.css');

try {
    let content = fs.readFileSync(cssPath, 'utf8');

    // The "garbage" might look like boxes or spaces in UTF-8

    // We know the file was good up to the end of .hover-glow-pink:hover
    const marker = '.hover-glow-pink:hover {';
    const markerIndex = content.lastIndexOf(marker);

    if (markerIndex === -1) {
        console.error('Could not find marker in CSS files.');
        process.exit(1);
    }

    // Find the closing brace of that block
    const closingBraceIndex = content.indexOf('}', markerIndex);

    if (closingBraceIndex === -1) {
        console.error('Could not find closing brace.');
        process.exit(1);
    }

    // Keep content up to closing brace
    const validContent = content.substring(0, closingBraceIndex + 1);

    // The new CSS we wanted to add
    const newCss = `

/* Skeuomorphic Pink Prominent Button */
.btn-skeuo-pink {
  background: linear-gradient(to bottom, #ff8eb3 0%, #ff6b9d 50%, #e83e8c 100%);
  color: white !important;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid #c21b64;
  border-radius: 50px;
  box-shadow: 
    0 6px 0 #c21b64, /* The solid 3D "side" */
    0 12px 14px rgba(255, 62, 157, 0.35), /* Drop shadow */
    inset 0 1px 0 rgba(255, 255, 255, 0.5), /* Top inner highlight */
    inset 0 -1px 0 rgba(0, 0, 0, 0.1); 
  text-shadow: 0 1px 2px rgba(160, 20, 60, 0.6);
  padding: 14px 32px;
  position: relative;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
}

.btn-skeuo-pink:hover {
  background: linear-gradient(to bottom, #ff9ebf 0%, #ff7aa6 50%, #f04e9d 100%);
  transform: translateY(-2px);
  box-shadow: 
    0 8px 0 #be155f, 
    0 16px 20px rgba(255, 62, 157, 0.4), 
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  filter: brightness(1.05);
}

.btn-skeuo-pink:active {
  transform: translateY(4px);
  box-shadow: 
    0 2px 0 #be155f, /* Reduced 3D side */
    0 4px 6px rgba(255, 62, 157, 0.3),
    inset 0 2px 4px rgba(0, 0, 0, 0.2);
  border-top-color: rgba(0, 0, 0, 0.1);
}

/* Add a shimmer effect for validation/success if needed */
.btn-skeuo-pink::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: skewX(-25deg);
  transition: none;
  pointer-events: none;
}
`;

    fs.writeFileSync(cssPath, validContent + newCss, 'utf8');
    console.log('Successfully fixed index.css');

} catch (err) {
    console.error('Error fixing CSS:', err);
}
