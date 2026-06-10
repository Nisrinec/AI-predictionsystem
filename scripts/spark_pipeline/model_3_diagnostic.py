import builtins


class DiagnosticDecisionEngine:
    """
    MODEL 3:
    Diagnostic using current vibration + future vibration prediction.

    Based on vibration severity thresholds.
    """

    def get_level(self, vibration):
        if vibration >= 11:
            return "Critique"
        elif vibration >= 7:
            return "Élevé"
        elif vibration >= 2.5:
            return "Moyen"
        return "Faible"

    def detect_problems(self, vibration):
        vibration_level = self.get_level(vibration)

        if vibration >= 11:
            sudden_failure = "Critique"
        elif vibration >= 7:
            sudden_failure = "Élevé"
        elif vibration >= 4:
            sudden_failure = "Moyen"
        else:
            sudden_failure = "Faible"

        return {
            "problem_vibration": vibration_level,
            "problem_sudden_failure": sudden_failure
        }

    def global_risk(self, problems, ai_anomaly_label="Normal"):
        levels = list(problems.values())

        if ai_anomaly_label == "Anomalie détectée":
            levels.append("Élevé")

        if "Critique" in levels:
            return "Critique"
        elif "Élevé" in levels:
            return "Élevé"
        elif "Moyen" in levels:
            return "Moyen"
        return "Faible"

    def calculate_risk_score(self, vibration, ai_anomaly_score=0):
        rule_score = int((vibration / 11) * 100)
        score = builtins.max(rule_score, ai_anomaly_score)
        return builtins.max(0, builtins.min(100, score))

    def estimate_rul(self, current_risk, risk_12h, risk_24h, risk_48h, risk_score):
        if current_risk == "Critique" or risk_score >= 85:
            return 48
        if risk_12h == "Critique":
            return 100
        if risk_24h == "Critique":
            return 180
        if risk_48h == "Critique":
            return 300
        if current_risk == "Élevé" or risk_score >= 65:
            return 400
        if current_risk == "Moyen" or risk_score >= 40:
            return 900
        return 3000

    def maintenance_priority(self, current_risk, risk_12h, risk_24h, rul_hours):
        if current_risk == "Critique" or risk_12h == "Critique" or rul_hours <= 100:
            return "Priorité haute"
        if current_risk == "Élevé" or risk_24h in ["Élevé", "Critique"] or rul_hours <= 400:
            return "Priorité moyenne"
        return "Priorité faible"

    def maintenance_recommendation(self, current_risk, risk_12h, risk_24h, rul_hours, ai_anomaly_label):
        if current_risk == "Critique" or rul_hours <= 100:
            return "Maintenance urgente requise"
        if ai_anomaly_label == "Anomalie détectée":
            return "Anomalie IA détectée - inspection recommandée"
        if risk_12h == "Critique":
            return "Intervention à planifier dans les prochaines 12 heures"
        if risk_24h in ["Élevé", "Critique"]:
            return "Intervention à planifier rapidement"
        if current_risk == "Moyen" or risk_12h == "Moyen":
            return "Surveillance renforcée recommandée"
        return "Paramètres normaux"

    def generate_alert(self, machine_name, part_name, problems, risk, rul_hours, vibration):
        alerts = []

        if problems["problem_vibration"] in ["Élevé", "Critique"]:
            alerts.append(f"vibration élevée {vibration:.2f} mm/s")

        if problems["problem_sudden_failure"] in ["Élevé", "Critique"]:
            alerts.append("risque de panne soudaine")

        if not alerts:
            return "Aucune alerte critique"

        return (
            f"{machine_name} - {part_name}: "
            + ", ".join(alerts)
            + f" | RUL estimée: ~{rul_hours}h | Sévérité: {risk}"
        )

    def analyze(
        self,
        machine_name,
        part_name,
        current_vibration,
        predicted_values,
        ai_anomaly_label="Normal",
        ai_anomaly_score=0
    ):
        current_problems = self.detect_problems(current_vibration)
        problems_12h = self.detect_problems(predicted_values["vibration_12h"])
        problems_24h = self.detect_problems(predicted_values["vibration_24h"])
        problems_48h = self.detect_problems(predicted_values["vibration_48h"])

        current_risk = self.global_risk(current_problems, ai_anomaly_label)
        risk_12h = self.global_risk(problems_12h)
        risk_24h = self.global_risk(problems_24h)
        risk_48h = self.global_risk(problems_48h)

        risk_score = self.calculate_risk_score(
            current_vibration,
            ai_anomaly_score
        )

        rul_hours = self.estimate_rul(
            current_risk,
            risk_12h,
            risk_24h,
            risk_48h,
            risk_score
        )

        priority = self.maintenance_priority(
            current_risk,
            risk_12h,
            risk_24h,
            rul_hours
        )

        recommendation = self.maintenance_recommendation(
            current_risk,
            risk_12h,
            risk_24h,
            rul_hours,
            ai_anomaly_label
        )

        alert_message = self.generate_alert(
            machine_name,
            part_name,
            current_problems,
            current_risk,
            rul_hours,
            current_vibration
        )

        health_score = 100 - risk_score
        health_score = builtins.max(0, builtins.min(100, health_score))

        return {
            "current_risk": current_risk,
            "risk_12h": risk_12h,
            "risk_24h": risk_24h,
            "risk_48h": risk_48h,

            "risk_score": int(risk_score),
            "health_score": int(health_score),
            "rul_hours": int(rul_hours),

            "maintenance_priority": priority,
            "maintenance_recommendation": recommendation,
            "alert_message": alert_message,

            "current_problem_vibration": current_problems["problem_vibration"],
            "current_problem_sudden_failure": current_problems["problem_sudden_failure"],

            "future_12h_problem_vibration": problems_12h["problem_vibration"],
            "future_12h_problem_sudden_failure": problems_12h["problem_sudden_failure"],

            "future_24h_problem_vibration": problems_24h["problem_vibration"],
            "future_24h_problem_sudden_failure": problems_24h["problem_sudden_failure"],

            "future_48h_problem_vibration": problems_48h["problem_vibration"],
            "future_48h_problem_sudden_failure": problems_48h["problem_sudden_failure"],
        }