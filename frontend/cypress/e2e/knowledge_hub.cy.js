describe('Knowledge Hub - 🛡️ KURŞUN GEÇİRMEZ (Bulletproof) E2E Testi', () => {

  // Bütün senaryoları tek bir 'it' bloğunda birleştirdik. 
  // Böylece sadece 1 kez giriş yapılacak ve 429 (Ban) hatası almayacağız!
  it('Kullanıcının Tam Günlük Sistemi Kullanım Serüveni', () => {
    
    // ============================================================
    // 1. GİRİŞ (Login)
    // ============================================================
    cy.visit('http://localhost:5173')
    cy.get('input[type="email"]').clear().type('zeynep.demir@company.com')
    cy.get('input[type="password"]').clear().type('ZeynepSecure2026!')
    cy.contains('Sisteme Giriş Yap').click()
    cy.contains('Knowledge Hub', { timeout: 10000 }).should('be.visible')

    // ============================================================
    // 2. MOBİL DİRENÇ TESTİ (iPhone X)
    // ============================================================
    cy.viewport('iphone-x')
    cy.contains('Knowledge Hub').should('be.visible')
    cy.viewport(1280, 720)

    // ============================================================
    // 3. YAPAY ZEKA RAG SOHBETİ
    // ============================================================
    cy.intercept('POST', '**/api/v1/chat/').as('askAI')
    // Küçük/büyük harf takıntısını kaldırmak için regex (/ /i) kullanıyoruz
    cy.contains(/New Chat/i).click({ force: true })
    cy.get('input[type="text"]').type('Sistem test mesajı{enter}')
    cy.get('.animate-bounce').should('exist') // Düşünme animasyonu
    cy.wait('@askAI', { timeout: 15000 }).its('response.statusCode').should('eq', 200)

    // ============================================================
    // 4. SOHBET SİLME
    // Cypress onay kutularını görünmez şekilde otomatik kabul eder.
    // Bu yüzden direkt işlemin sonucunu arıyoruz.
    // ============================================================
    cy.get('[title="Sil"]').first().click({ force: true })
    cy.contains(/silindi/i, { timeout: 5000 }).should('be.visible')

    // ============================================================
    // 5. ADMIN PANELİ (RBAC KONTROLÜ)
    // ============================================================
    cy.get('[title="Admin Paneli"]').click({ force: true })
    cy.contains(/Mevcut Kullanıcılar/i, { timeout: 10000 }).should('be.visible')
    cy.contains(/zeynep.demir@company.com/i).should('be.visible')
    cy.contains(/admin/i).should('be.visible')

    // ============================================================
    // 6. GÜVENLİ ÇIKIŞ VE SESSION(OTURUM) KORUMASI
    // ============================================================
    // Sol menüdeki en son butonu bul ve zorla (force) tıkla
    cy.get('aside button').last().click({ force: true })
    cy.contains(/Sisteme Giriş Yap/i, { timeout: 10000 }).should('be.visible')

    // 🕵️‍♂️ SİBER GÜVENLİK: Kilitli Kapı Testi (Geri dönmeye çalış)
    cy.go('back')
    cy.contains(/Sisteme Giriş Yap/i).should('be.visible')
  })

})