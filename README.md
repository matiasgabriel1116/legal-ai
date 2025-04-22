# BNR Platform - White-Label Legal AI SaaS

Welcome to the BNR Platform, a white-label legal AI SaaS solution built to empower lawyers with personalized AI legal assistance. This platform enables seamless document analysis, intelligent legal support in Arabic, and powerful admin capabilities using GPT-4 Turbo, LlamaIndex, and Supabase.

---

## 🚀 Features Overview

### For Lawyers
- **Smart Legal Chat Assistant** powered by GPT-4 Turbo
- **Document-Based Intelligence**: Upload PDF/Word documents to get case-aware answers
- **Official Documents Access**: Receive insights from admin-uploaded laws and rulings
- **Memory Per Session**: Past conversations are grouped by case

### For Admins
- **User Management**: View, add, or remove lawyer accounts
- **Premium Access Toggle**: Control user privileges
- **Common Legal Documents Upload**: Populate platform-wide reference material

---

## 📸 UI Screens

1. **User Dashboard**: Personalized greeting, platform capabilities, AI assistant entry point
2. **Admin Dashboard**: View user and document statistics
3. **Users Management**: Toggle premium access, invite/delete users
4. **Chat Interface**: AI assistant integrated with GPT-4 Turbo and document-aware answers
5. **File Upload View**: Drag-and-drop interface supporting PDF and Word files

---

## 🧠 How It Works - Intelligence Stack

The BNR Platform adjusts its AI chat behavior based on document availability:

- If no documents are uploaded by the admin, the lawyer interacts with a general GPT-4 Turbo model.
- If the admin uploads documents, the assistant uses those to provide contextually accurate responses.
- If both admin and the lawyer upload documents, the assistant responds based on the combined document set for enhanced accuracy.

### 1. Legal Knowledge Base
- Indexed Saudi regulations, court rulings, and official circulars
- Organized using a classification system based on 32 legal categories

### 2. GPT-4 Turbo Engine
- Delivers contextual and accurate legal assistance through prompt engineering
- Provides fallback answers when no document match is found

### 3. Case Knowledge Extraction
- LlamaIndex parses user-uploaded documents (PDF, Word)
- Extracted content is used to enhance response relevance and accuracy

---

## 🧩 Core Components

### Frontend (Next.js + TypeScript)
- Responsive and clean UI for users and admins
- Dedicated views for chat, dashboard, admin panel, and document upload

### Backend (Supabase + Vercel)
- Supabase Auth for secure login and session management
- Supabase Storage for private file handling
- Row-Level Security (RLS) for access control
- Vercel for fast and reliable deployment

### Chat & Embedding
- GPT-4 Turbo API integration
- LlamaIndex for document parsing and chunking
- Semantic search via vector embeddings
- Fallback GPT responses for general queries

---

## 👥 Project Credits
- **Platform Name**: BNR Platform
- **Primary Stack**: Next.js 15, Supabase, GPT-4 Turbo, LlamaIndex
- **Deployment**: [https://legal-ai-phi.vercel.app/](https://legal-ai-phi.vercel.app/)

---

## 📩 Questions or Suggestions?
Feel free to reach out or contribute to the project via GitHub.

> "Empowering legal minds through collective intelligence and AI-driven precision."

---

© 2025 BNR Platform. All rights reserved.

