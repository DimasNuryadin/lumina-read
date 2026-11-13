'use client';

import React from 'react';
import { GoeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';

export default function ToasterProvider() {
  return (
    <GoeyToaster
      position="bottom-right"
      theme="system"
      closeButton={true}
    />
  );
}
