{{/*
Chart name, truncated to fit Kubernetes' 63-char label limit.
*/}}
{{- define "hn-crawler.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Release-qualified full name, so the same chart can be installed more
than once in a cluster without colliding.
*/}}
{{- define "hn-crawler.fullname" -}}
{{- if contains .Chart.Name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Common labels applied to every resource.
*/}}
{{- define "hn-crawler.labels" -}}
app.kubernetes.io/name: {{ include "hn-crawler.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end -}}

{{/*
Selector labels — must stay stable across upgrades (unlike the full
label set above, which can gain chart-version/app-version churn).
*/}}
{{- define "hn-crawler.selectorLabels" -}}
app.kubernetes.io/name: {{ include "hn-crawler.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
