from typing import List, Dict
from .models import (
    MatchRequest, MatchResponse, JobMatchView, StudentMatchView,
    StudentProfile, EmploymentRulePack, JobFitResult
)
from .fit_score import compute_fit_score_for_job

def match_students_to_jobs(req: MatchRequest) -> MatchResponse:
    job_to_fits: Dict[str, List[JobFitResult]] = {}
    student_to_fits: Dict[str, List[JobFitResult]] = {}
    
    for job in req.jobs:
        fits_for_job: List[JobFitResult] = []
        for student in req.students:
            fit = compute_fit_score_for_job(student, job)
            fits_for_job.append(fit)
            student_to_fits.setdefault(student.id, []).append(fit)
        
        fits_for_job.sort(key=lambda x: x.fit_score, reverse=True)
        job_to_fits[job.job_posting_id] = fits_for_job[:req.top_k_per_job]
    
    for stu_id, fits in student_to_fits.items():
        fits.sort(key=lambda x: x.fit_score, reverse=True)
    
    jobs_view = [
        JobMatchView(
            job_posting_id=job.job_posting_id,
            employer_id=job.employer_id,
            position=job.job_posting_id,
            fits=job_to_fits.get(job.job_posting_id, [])
        )
        for job in req.jobs
    ]
    
    students_view = []
    for student in req.students:
        fits = student_to_fits.get(student.id, [])
        best = fits[0].job_posting_id if fits else None
        students_view.append(StudentMatchView(
            student_id=student.id,
            student_name=student.full_name,
            jobs=fits,
            best_match=best
        ))
    
    total_matches = sum(1 for s in students_view for j in s.jobs if j.fit_percent >= 60)
    
    return MatchResponse(
        jobs=jobs_view,
        students=students_view,
        summary={
            "total_students": len(req.students),
            "total_jobs": len(req.jobs),
            "qualified_matches": total_matches,
            "match_rate": round(total_matches / (len(req.students) * len(req.jobs)) * 100, 1) if req.jobs else 0
        }
    )
